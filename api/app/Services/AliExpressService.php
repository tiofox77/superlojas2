<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Thin client for the AliExpress Open Platform (International/IOP gateway).
 *
 * Credentials are read from the database (Settings table, managed in the admin
 * panel) with a fallback to config/.env. Until configured, methods degrade
 * gracefully: importProduct() falls back to scraping / minimal draft.
 */
class AliExpressService
{
    private ?string $appKey;
    private ?string $appSecret;
    private ?string $accessToken;
    private string $gateway;
    private string $shipTo;
    private string $currency;
    private string $language;
    private bool $scrapeEnabled;
    private string $scrapeUa;

    public function __construct()
    {
        $this->appKey = self::setting('aliexpress_app_key', config('services.aliexpress.app_key'));
        $this->appSecret = self::setting('aliexpress_app_secret', config('services.aliexpress.app_secret'));
        $this->accessToken = self::setting('aliexpress_access_token', config('services.aliexpress.access_token'));
        $this->gateway = self::setting('aliexpress_gateway', config('services.aliexpress.gateway')) ?: 'https://api-sg.aliexpress.com/sync';
        $this->shipTo = self::setting('aliexpress_ship_to', config('services.aliexpress.ship_to', 'AO')) ?: 'AO';
        $this->currency = self::setting('aliexpress_currency', config('services.aliexpress.currency', 'USD')) ?: 'USD';
        $this->language = self::setting('aliexpress_language', config('services.aliexpress.language', 'pt')) ?: 'pt';
        $this->scrapeEnabled = filter_var(self::setting('aliexpress_scrape_enabled', config('services.aliexpress.scrape_enabled', true)), FILTER_VALIDATE_BOOL);
        $this->scrapeUa = self::setting('aliexpress_scrape_ua', config('services.aliexpress.scrape_user_agent')) ?: 'Mozilla/5.0';
    }

    /**
     * Read a setting from the DB, falling back to the given default (config/.env).
     * Empty string is treated as unset.
     */
    private static function setting(string $key, $default = null)
    {
        try {
            $v = Setting::get($key);
        } catch (\Throwable $e) {
            $v = null; // settings table not migrated yet
        }
        return ($v === null || $v === '') ? $default : $v;
    }

    public function isConfigured(): bool
    {
        return !empty($this->appKey) && !empty($this->appSecret);
    }

    /**
     * Extract the numeric AliExpress product id from a URL or raw id.
     * Handles: /item/1005006******.html, /i/1005006******.html, m.aliexpress,
     * ?productId=..., or a bare numeric id.
     */
    public function extractProductId(string $input): ?string
    {
        $input = trim($input);

        if (preg_match('/^\d{6,}$/', $input)) {
            return $input;
        }
        // /item/<id>.html  or  /i/<id>.html
        if (preg_match('#/(?:item|i)/(\d{6,})\.html#i', $input, $m)) {
            return $m[1];
        }
        // productId / product_id query param
        if (preg_match('#[?&]product_?id=(\d{6,})#i', $input, $m)) {
            return $m[1];
        }
        // any long digit run as last resort
        if (preg_match('#(\d{9,})#', $input, $m)) {
            return $m[1];
        }
        return null;
    }

    /**
     * Import a product by URL or id. Returns a normalized draft ready to be
     * reviewed and sent to POST /products.
     *
     * @return array{ok:bool, needs_keys?:bool, error?:string, draft?:array}
     */
    public function importProduct(string $urlOrId): array
    {
        $productId = $this->extractProductId($urlOrId);
        if (!$productId) {
            return ['ok' => false, 'error' => 'Nao foi possivel extrair o ID do produto do link fornecido.'];
        }

        $sourceUrl = str_starts_with($urlOrId, 'http')
            ? $urlOrId
            : "https://www.aliexpress.com/item/{$productId}.html";

        if (!$this->isConfigured()) {
            // No official API keys: try best-effort scraping.
            $scraped = $this->scrapeProduct($productId, $sourceUrl);
            if ($scraped['ok'] && !($scraped['empty'] ?? false)) {
                return ['ok' => true, 'source' => 'scrape', 'draft' => $scraped['draft']];
            }
            // Scraping blocked/empty: return the minimal draft and signal that
            // either API keys or the Hermes bridge is needed for full data.
            return [
                'ok' => true,
                'needs_keys' => true,
                'source' => 'none',
                'scrape_note' => $scraped['error'] ?? 'Scraping nao retornou dados (AliExpress pode ter bloqueado). Use o bridge do Hermes.',
                'draft' => [
                    'ae_product_id' => $productId,
                    'ae_source_url' => $sourceUrl,
                    'name' => null,
                    'description' => null,
                    'images' => [],
                    'price' => null,
                    'ae_cost' => null,
                    'ae_currency' => $this->currency,
                    'variants' => [],
                ],
            ];
        }

        try {
            $resp = $this->call('aliexpress.ds.product.get', [
                'product_id' => $productId,
                'ship_to_country' => $this->shipTo,
                'target_currency' => $this->currency,
                'target_language' => $this->language,
            ]);
        } catch (\Throwable $e) {
            Log::warning('AliExpress import failed: ' . $e->getMessage());
            return ['ok' => false, 'error' => 'Falha ao contactar a API do AliExpress: ' . $e->getMessage()];
        }

        return [
            'ok' => true,
            'draft' => $this->normalize($resp, $productId, $sourceUrl),
        ];
    }

    /**
     * Make a signed request to the Open Platform gateway.
     */
    public function call(string $method, array $params = []): array
    {
        if (!$this->isConfigured()) {
            throw new \RuntimeException('AliExpress API nao configurada (falta APP_KEY/APP_SECRET).');
        }

        $system = [
            'app_key' => $this->appKey,
            'method' => $method,
            'timestamp' => (string) round(microtime(true) * 1000), // ms
            'sign_method' => 'sha256',
            'format' => 'json',
            'v' => '2.0',
        ];
        if ($this->accessToken) {
            $system['session'] = $this->accessToken;
        }

        $all = array_merge($system, $params);
        $all['sign'] = $this->sign($all);

        $response = Http::timeout(30)
            ->asForm()
            ->post($this->gateway, $all);

        $json = $response->json();
        if (!is_array($json)) {
            throw new \RuntimeException('Resposta invalida da API AliExpress.');
        }
        // Open Platform returns errors under error_response
        if (isset($json['error_response'])) {
            $err = $json['error_response'];
            throw new \RuntimeException($err['msg'] ?? ($err['sub_msg'] ?? 'Erro da API AliExpress.'));
        }

        return $json;
    }

    /**
     * Best-effort HTML scrape of an AliExpress product page.
     * Extracts from OpenGraph tags, JSON-LD and the embedded runParams blob.
     * AliExpress aggressively blocks bots, so treat results as partial.
     *
     * @return array{ok:bool, empty?:bool, error?:string, draft?:array}
     */
    public function scrapeProduct(string $productId, string $sourceUrl): array
    {
        if (!$this->scrapeEnabled) {
            return ['ok' => false, 'error' => 'Scraping desativado.'];
        }

        try {
            $res = Http::withHeaders([
                'User-Agent' => $this->scrapeUa,
                'Accept' => 'text/html,application/xhtml+xml',
                'Accept-Language' => 'pt-PT,pt;q=0.9,en;q=0.8',
            ])->timeout(20)->get($sourceUrl);
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => 'Falha ao abrir a pagina: ' . $e->getMessage()];
        }

        if (!$res->ok()) {
            return ['ok' => false, 'error' => 'HTTP ' . $res->status() . ' ao abrir a pagina.'];
        }

        $html = $res->body();
        if (!$html || stripos($html, 'captcha') !== false && strlen($html) < 5000) {
            return ['ok' => false, 'error' => 'Pagina bloqueada (captcha/anti-bot).'];
        }

        $meta = fn (string $prop) => preg_match(
            '/<meta[^>]+(?:property|name)=["\']' . preg_quote($prop, '/') . '["\'][^>]+content=["\']([^"\']+)["\']/i',
            $html, $m
        ) ? html_entity_decode($m[1], ENT_QUOTES) : null;

        $name = $meta('og:title');
        $description = $meta('og:description');
        $ogImage = $meta('og:image');
        $price = $meta('og:price:amount') ?? $meta('product:price:amount');

        $images = [];
        if ($ogImage) {
            $images[] = str_starts_with($ogImage, '//') ? 'https:' . $ogImage : $ogImage;
        }

        // JSON-LD
        if (preg_match_all('/<script[^>]+type=["\']application\/ld\+json["\'][^>]*>(.*?)<\/script>/is', $html, $lds)) {
            foreach ($lds[1] as $ld) {
                $data = json_decode(trim($ld), true);
                if (!is_array($data)) continue;
                $name = $name ?: ($data['name'] ?? null);
                $description = $description ?: ($data['description'] ?? null);
                $price = $price ?: (data_get($data, 'offers.price') ?? data_get($data, 'offers.lowPrice'));
                foreach ((array) ($data['image'] ?? []) as $img) {
                    if (is_string($img)) $images[] = $img;
                }
            }
        }

        // AliExpress runParams blob (image galleries, sku prices)
        if (preg_match('/window\.runParams\s*=\s*(\{.*?\});/s', $html, $rp)) {
            $rpData = json_decode($rp[1], true);
            $imgList = data_get($rpData, 'data.imageModule.imagePathList', []);
            foreach ((array) $imgList as $img) {
                if (is_string($img)) $images[] = str_starts_with($img, '//') ? 'https:' . $img : $img;
            }
            $name = $name ?: data_get($rpData, 'data.titleModule.subject');
            $price = $price ?: data_get($rpData, 'data.priceModule.minActivityAmount.value')
                ?? data_get($rpData, 'data.priceModule.minAmount.value');
        }

        $images = array_values(array_unique(array_filter($images)));

        $draft = [
            'ae_product_id' => $productId,
            'ae_source_url' => $sourceUrl,
            'name' => $name,
            'description' => $description,
            'images' => $images,
            'price' => null,
            'ae_cost' => $price !== null ? (float) $price : null,
            'ae_currency' => $this->currency,
            'variants' => [],
        ];

        // Consider it empty if we got neither a name nor any image.
        $empty = empty($name) && empty($images);

        return ['ok' => true, 'empty' => $empty, 'draft' => $draft];
    }

    /**
     * Build a normalized draft from fields gathered externally (e.g. the Hermes
     * agent that opened the page in a real browser). Keeps only known keys.
     */
    public function draftFromFields(array $fields): array
    {
        $productId = $fields['ae_product_id']
            ?? (isset($fields['url']) ? $this->extractProductId($fields['url']) : null);
        $sourceUrl = $fields['ae_source_url'] ?? $fields['url'] ?? null;

        $images = $fields['images'] ?? [];
        if (is_string($images)) {
            $images = array_values(array_filter(array_map('trim', preg_split('/[\n,]+/', $images))));
        }

        return [
            'ae_product_id' => $productId,
            'ae_source_url' => $sourceUrl,
            'name' => $fields['name'] ?? null,
            'description' => $fields['description'] ?? null,
            'images' => array_values(array_filter((array) $images)),
            'price' => $fields['price'] ?? null,
            'ae_cost' => isset($fields['ae_cost']) ? (float) $fields['ae_cost'] : null,
            'ae_currency' => $fields['ae_currency'] ?? $this->currency,
            'variants' => $fields['variants'] ?? [],
        ];
    }

    /**
     * IOP-style signature: sort params by key, concat key.value pairs,
     * HMAC-SHA256 with app_secret, uppercase hex.
     */
    private function sign(array $params): string
    {
        ksort($params);
        $base = '';
        foreach ($params as $k => $v) {
            if ($k === 'sign' || $v === null || $v === '') {
                continue;
            }
            $base .= $k . $v;
        }
        return strtoupper(hash_hmac('sha256', $base, $this->appSecret));
    }

    /**
     * Map the AliExpress product payload into our product draft shape.
     * Field paths are defensive because the API wraps data deeply.
     */
    private function normalize(array $resp, string $productId, string $sourceUrl): array
    {
        // The result is nested; dig for the common containers.
        $result = data_get($resp, 'aliexpress_ds_product_get_response.result', $resp);

        $name = data_get($result, 'ae_item_base_info_dto.subject')
            ?? data_get($result, 'subject')
            ?? null;

        $description = data_get($result, 'ae_item_base_info_dto.detail')
            ?? data_get($result, 'detail')
            ?? null;

        // Images: often a semicolon/URL list
        $images = [];
        $imgStr = data_get($result, 'ae_multimedia_info_dto.image_urls')
            ?? data_get($result, 'image_urls');
        if (is_string($imgStr)) {
            $images = array_values(array_filter(array_map('trim', preg_split('/[;\s]+/', $imgStr))));
        } elseif (is_array($imgStr)) {
            $images = $imgStr;
        }

        // Price (supplier cost)
        $cost = data_get($result, 'ae_item_sku_info_dtos.ae_item_sku_info_d_t_o.0.offer_sale_price')
            ?? data_get($result, 'ae_item_base_info_dto.sale_price')
            ?? null;

        return [
            'ae_product_id' => $productId,
            'ae_source_url' => $sourceUrl,
            'name' => $name,
            'description' => $description,
            'images' => $images,
            'price' => null,          // final sale price is decided by the seller / AI
            'ae_cost' => $cost !== null ? (float) $cost : null,
            'ae_currency' => $this->currency,
            'variants' => data_get($result, 'ae_item_sku_info_dtos', []),
            '_raw' => $result,
        ];
    }
}
