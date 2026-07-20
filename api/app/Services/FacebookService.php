<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Setting;
use App\Models\Store;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Facebook / Instagram Commerce catalog sync.
 *
 * Works per-store (pass a Store — uses that store's credentials and only its
 * products) or globally (no store — marketplace-wide, credentials from Settings).
 *
 * Two mechanisms:
 *  - CSV product feed that Facebook pulls on a schedule (no token needed).
 *  - Graph API items_batch push ("sync now"), needs access token + catalog id.
 */
class FacebookService
{
    private const GRAPH = 'https://graph.facebook.com/v21.0';

    private ?Store $store;
    private ?string $token;
    private ?string $catalogId;
    private string $currency;

    public function __construct(?Store $store = null)
    {
        $this->store = $store;

        if ($store) {
            $this->token = $store->fb_access_token ?: null;
            $this->catalogId = $store->fb_catalog_id ?: null;
            $this->currency = $store->fb_currency ?: 'AOA';
        } else {
            $this->token = self::setting('facebook_access_token');
            $this->catalogId = self::setting('facebook_catalog_id');
            $this->currency = self::setting('facebook_currency', 'AOA') ?: 'AOA';
        }
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

    /** Product query scoped to the store (or all products, globally). */
    private function productQuery(): Builder
    {
        $q = Product::with('store:id,name,slug')->where('is_active', true);
        if ($this->store) {
            $q->where('store_id', $this->store->id);
        }
        return $q;
    }

    private function baseUrl(): string
    {
        return rtrim(config('app.url', 'https://superloja.vip'), '/');
    }

    private function imageUrl(?string $path): ?string
    {
        if (!$path) return null;
        if (str_starts_with($path, 'http')) return $path;
        return $this->baseUrl() . '/' . ltrim($path, '/');
    }

    public function retailerId(Product $p): string
    {
        return 'SL-' . $p->id;
    }

    /** Map a product to the Facebook catalog item shape. */
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
            return ['ok' => true, 'message' => 'Catálogo "' . ($json['name'] ?? '?') . '" — ' . ($json['product_count'] ?? 0) . ' produtos.'];
        } catch (\Throwable $e) {
            return ['ok' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * List the Facebook Businesses + their product catalogs available to the
     * given token, so the user can pick one from a dropdown instead of typing
     * the Catalog ID by hand.
     *
     * @return array{ok:bool, businesses?:array, error?:string}
     */
    public function listCatalogs(?string $tokenOverride = null): array
    {
        $token = $tokenOverride ?: $this->token;
        if (!$token) {
            return ['ok' => false, 'error' => 'Cole o Access Token primeiro.'];
        }
        try {
            $res = Http::timeout(20)->get(self::GRAPH . '/me/businesses', [
                'fields' => 'id,name,owned_product_catalogs{id,name,product_count}',
                'access_token' => $token,
            ]);
            $json = $res->json();
            if (isset($json['error'])) {
                $msg = $json['error']['message'] ?? 'Erro do Facebook.';
                if (stripos($msg, 'access token') !== false || stripos($msg, 'OAuth') !== false) {
                    $msg .= ' — Verifique se colou um Access Token válido (system user, começa por "EAA...") com as permissões business_management e catalog_management.';
                }
                return ['ok' => false, 'error' => $msg];
            }
            $businesses = [];
            foreach (($json['data'] ?? []) as $b) {
                $cats = [];
                foreach (data_get($b, 'owned_product_catalogs.data', []) as $c) {
                    $cats[] = [
                        'id' => $c['id'],
                        'name' => $c['name'] ?? $c['id'],
                        'product_count' => $c['product_count'] ?? null,
                    ];
                }
                $businesses[] = [
                    'id' => $b['id'],
                    'name' => $b['name'] ?? $b['id'],
                    'catalogs' => $cats,
                ];
            }
            return ['ok' => true, 'businesses' => $businesses];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    /** Push a batch of products via items_batch. */
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

    /** Sync all in-scope active products to the catalog (chunked). */
    public function syncAll(): array
    {
        if (!$this->isConfigured()) {
            return ['ok' => false, 'synced' => 0, 'batches' => 0, 'error' => 'Facebook não configurado.'];
        }
        $synced = 0;
        $batches = 0;
        try {
            $this->productQuery()->chunk(200, function ($chunk) use (&$synced, &$batches) {
                $this->syncBatch($chunk->all(), 'UPDATE');
                $synced += $chunk->count();
                $batches++;
            });

            if ($this->store) {
                $this->store->forceFill(['fb_last_synced_at' => now()])->save();
            } else {
                Setting::set('facebook_last_sync', now()->toIso8601String());
            }
            return ['ok' => true, 'synced' => $synced, 'batches' => $batches];
        } catch (\Throwable $e) {
            Log::warning('Facebook syncAll failed: ' . $e->getMessage());
            return ['ok' => false, 'synced' => $synced, 'batches' => $batches, 'error' => $e->getMessage()];
        }
    }

    /** Build the CSV product feed (Facebook catalog spec) for in-scope products. */
    public function buildCsvFeed(): string
    {
        $headers = ['id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link', 'brand'];
        $out = fopen('php://temp', 'r+');
        fputcsv($out, $headers);

        $this->productQuery()->chunk(500, function ($chunk) use ($out, $headers) {
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
