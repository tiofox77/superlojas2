<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Records and ranks product demand (table product_demand_daily).
 *
 * Score over the last 30 days, recent week counting double:
 *   5 × WhatsApp questions (Hermes) + 4 × WhatsApp button clicks + 3 × cart adds
 *   + 2 × search results + 1 × product page views
 */
class ProductDemand
{
    public const FIELDS = ['views', 'whatsapp_clicks', 'whatsapp_inquiries', 'search_hits', 'cart_adds'];

    private const WEIGHTS = [
        'whatsapp_inquiries' => 5,
        'whatsapp_clicks' => 4,
        'cart_adds' => 3,
        'search_hits' => 2,
        'views' => 1,
    ];

    /** Add $n to one counter of a product for today. Never throws: demand data is best-effort. */
    public function record(int $productId, int $storeId, string $field, int $n = 1): void
    {
        if (!in_array($field, self::FIELDS, true) || $n < 1) return;
        try {
            DB::table('product_demand_daily')->upsert(
                [['product_id' => $productId, 'store_id' => $storeId, 'day' => now()->toDateString(), $field => $n]],
                ['product_id', 'day'],
                [$field => DB::raw("{$field} + {$n}")]
            );
        } catch (\Throwable $e) {
            Log::warning('ProductDemand::record failed', ['error' => $e->getMessage()]);
        }
    }

    /** Count a search term (normalised) for today. */
    public function recordSearch(string $term, string $source, int $results): void
    {
        $term = self::normalise($term);
        if (mb_strlen($term) < 2) return;
        try {
            DB::table('search_terms_daily')->upsert(
                [['term' => $term, 'source' => $source, 'day' => now()->toDateString(), 'count' => 1, 'results' => $results]],
                ['term', 'source', 'day'],
                ['count' => DB::raw('count + 1'), 'results' => $results]
            );
        } catch (\Throwable $e) {
            Log::warning('ProductDemand::recordSearch failed', ['error' => $e->getMessage()]);
        }
    }

    /** True the first time a key is seen today (per-visitor dedupe). Fails open. */
    public function firstToday(string $key): bool
    {
        try {
            return Cache::add('demand:' . sha1($key) . ':' . now()->toDateString(), 1, now()->endOfDay());
        } catch (\Throwable $e) {
            return true;
        }
    }

    /**
     * Product ids ordered by demand score (highest first).
     *
     * @return array<int, float> product_id => score
     */
    public function scores(int $days = 30, ?int $storeId = null, int $limit = 100): array
    {
        $since = now()->subDays($days)->toDateString();
        $recent = now()->subDays(7)->toDateString();
        $points = collect(self::WEIGHTS)->map(fn ($w, $f) => "{$w} * {$f}")->implode(' + ');

        try {
            return DB::table('product_demand_daily')
                ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
                ->where('day', '>=', $since)
                ->groupBy('product_id')
                ->selectRaw("product_id, SUM(CASE WHEN day >= ? THEN 1 ELSE 0.5 END * ({$points})) as score", [$recent])
                ->orderByDesc('score')
                ->limit($limit)
                ->pluck('score', 'product_id')
                ->map(fn ($s) => (float) $s)
                ->all();
        } catch (\Throwable $e) {
            // e.g. before the migration has run: rank as if there were no demand data yet
            Log::warning('ProductDemand::scores failed', ['error' => $e->getMessage()]);
            return [];
        }
    }

    /** Per-product totals over the window, for reports. */
    public function totals(int $days, ?int $storeId = null)
    {
        $since = now()->subDays($days)->toDateString();
        return DB::table('product_demand_daily')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->where('day', '>=', $since)
            ->groupBy('product_id')
            ->selectRaw('product_id, SUM(views) as views, SUM(whatsapp_clicks) as whatsapp_clicks, SUM(whatsapp_inquiries) as whatsapp_inquiries, SUM(search_hits) as search_hits, SUM(cart_adds) as cart_adds')
            ->get()
            ->keyBy('product_id');
    }

    public static function normalise(string $term): string
    {
        $term = mb_strtolower(trim(preg_replace('/\s+/u', ' ', $term)));
        return mb_substr($term, 0, 100);
    }
}
