<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Setting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Facebook / Instagram Commerce Catalog sync.
 *
 * Two mechanisms:
 *  - Product feed (CSV) that Facebook pulls on a schedule (no token needed).
 *  - Graph API items_batch push ("sync now"), needs access token + catalog id.
 *
 * Credentials live in the DB (Settings), managed in the admin panel.
 */
class FacebookService
{
    private const GRAPH = 'https://graph.facebook.com/v21.0';

    private ?string $token;
    private ?string $catalogId;
    private string $currency;

    public function __construct()
    {
        $this->token = self::setting('facebook_access_token');
        $this->catalogId = self::setting('facebook_catalog_id');
        $this->currency = self::setting('facebook_currency', 'AOA') ?: 'AOA';
    }

    private static function setting(string $key, $default = null)
    {
        try {
            $v = Setting::get($key);
        } catch (\Throwable $e) {
            $v = null;
        }
        return ($v === null || $v === '') ? $default : $v;
    }

    public function isConfigured(): bool
    {
        return !empty($this->token) && !empty($this->catalogId);
    }

    private function baseUrl(): string
    {
        return rtrim(config('app.url', 'https://superloja.vip'), '/');
    }

    /** Absolute URL for a stored image path. */
    private function imageUrl(?string $path): ?string
    {
        if (!$path) return null;
        if (str_starts_with($path, 'http')) return $path;
        return $this->baseUrl() . '/' . ltrim($path, '/');
    }

    /** Retailer id used to identify the product in the FB catalog. */
    public function retailerId(Product $p): string
    {
        return 'SL-' . $p->id;
    }

    /**
     * Map a product to the Facebook catalog item shape.
     */
    public function mapProduct(Product $p): array
    {
        $img = $this->imageUrl(is_array($p->images) ? ($p->images[0] ?? null) : null);

        return [
            'id' => $this->retailerId($p),
            'title' => mb_substr((string) $p->name, 0, 150),
            'description' => mb_substr(strip_tags((string) ($p->description ?: $p->name)), 0, 5000),
            'availability' => ((int) $p->stock > 0) ? 'in stock' : 'out of stock',
            'condition' => 'new',
            'price' => number_format((float) $p->price, 2, '.', '') . ' ' . $this->currency,
            'link' => $this->baseUrl() . '/produto/' . $p->slug,
            'image_link' => $img,
            'brand' => optional($p->store)->name ?: 'SuperLojas',
        ];
    }

    /** Verify the token + catalog id are valid (read-only). */
    public function testConnection(): array
    {
        if (!$this->isConfigured()) {
            return ['ok' => false, 'message' => 'Faltam Access Token e/ou Catalog ID.'];
        }
        try {
            $res = Http::timeout(15)->get(self::GRAPH . "/{$this->catalogId}", [
                'fields' => 'name,product_count',
                'access_token' => $this->token,
            ]);
            $json = $res->json();
            if (isset($json['error'])) {
                return ['ok' => false, 'message' => $json['error']['message'] ?? 'Erro do Facebook.'];
            }
            return ['ok' => true, 'message' => 'Catálogo "' . ($json['name'] ?? '?') . '" — ' . ($json['product_count'] ?? 0) . ' produtos.', 'catalog' => $json];
        } catch (\Throwable $e) {
            return ['ok' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Push a batch of products to the catalog via items_batch.
     * @param 'UPDATE'|'DELETE' $method
     */
    public function syncBatch(array $products, string $method = 'UPDATE'): array
    {
        if (!$this->isConfigured()) {
            throw new \RuntimeException('Facebook não configurado (token/catalog id).');
        }

        $requests = [];
        foreach ($products as $p) {
            $requests[] = $method === 'DELETE'
                ? ['method' => 'DELETE', 'data' => ['id' => $this->retailerId($p)]]
                : ['method' => 'UPDATE', 'data' => $this->mapProduct($p)];
        }

        $res = Http::asJson()->timeout(30)->post(self::GRAPH . "/{$this->catalogId}/items_batch", [
            'access_token' => $this->token,
            'item_type' => 'PRODUCT_ITEM',
            'requests' => $requests,
        ]);

        $json = $res->json();
        if (isset($json['error'])) {
            throw new \RuntimeException($json['error']['message'] ?? 'Erro do Facebook items_batch.');
        }
        return is_array($json) ? $json : [];
    }

    /**
     * Sync all active products to the catalog (chunked).
     * @return array{ok:bool, synced:int, batches:int, error?:string}
     */
    public function syncAll(): array
    {
        if (!$this->isConfigured()) {
            return ['ok' => false, 'synced' => 0, 'batches' => 0, 'error' => 'Facebook não configurado.'];
        }
        $synced = 0;
        $batches = 0;
        try {
            Product::with('store:id,name,slug')
                ->where('is_active', true)
                ->chunk(200, function ($chunk) use (&$synced, &$batches) {
                    $this->syncBatch($chunk->all(), 'UPDATE');
                    $synced += $chunk->count();
                    $batches++;
                });
            Setting::set('facebook_last_sync', now()->toIso8601String());
            return ['ok' => true, 'synced' => $synced, 'batches' => $batches];
        } catch (\Throwable $e) {
            Log::warning('Facebook syncAll failed: ' . $e->getMessage());
            return ['ok' => false, 'synced' => $synced, 'batches' => $batches, 'error' => $e->getMessage()];
        }
    }

    /**
     * Build the CSV product feed (Facebook catalog spec) for all active products.
     * Facebook pulls this URL on a schedule — no token required on our side.
     */
    public function buildCsvFeed(): string
    {
        $headers = ['id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link', 'brand'];
        $out = fopen('php://temp', 'r+');
        fputcsv($out, $headers);

        Product::with('store:id,name,slug')
            ->where('is_active', true)
            ->chunk(500, function ($chunk) use ($out, $headers) {
                foreach ($chunk as $p) {
                    $item = $this->mapProduct($p);
                    fputcsv($out, array_map(fn ($h) => $item[$h] ?? '', $headers));
                }
            });

        rewind($out);
        $csv = stream_get_contents($out);
        fclose($out);
        return $csv;
    }
}
