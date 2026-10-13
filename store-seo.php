<?php
/** Server-rendered SEO shell for store subdomains and mapped domains. */
require __DIR__ . '/api/vendor/autoload.php';
$app = require_once __DIR__ . '/api/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

function ehtml(?string $value): string {
    return htmlspecialchars($value ?? '', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
function absoluteMedia(?string $path): string {
    if (!$path) return 'https://superloja.vip/og-image.png?v=20260722';
    if (preg_match('~^https?://~i', $path)) return $path;
    return 'https://superloja.vip' . (str_starts_with($path, '/') ? $path : '/' . $path);
}
function cleanDescription(?string $value, string $fallback): string {
    $text = trim(preg_replace('/\s+/u', ' ', strip_tags($value ?: $fallback)));
    return mb_substr($text, 0, 160);
}

$host = strtolower(preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? ''));
$mainHosts = ['superloja.vip', 'www.superloja.vip'];
$slug = null;
$store = null;

if (str_ends_with($host, '.superloja.vip')) {
    $slug = substr($host, 0, -strlen('.superloja.vip'));
    if (str_contains($slug, '.')) $slug = null;
}

if ($slug) {
    $store = DB::table('stores')->where('slug', $slug)->where('status', 'approved')->first();
} elseif (!in_array($host, $mainHosts, true)) {
    // Forward-compatible support for a future real custom-domain column.
    foreach (['custom_domain', 'domain', 'store_domain'] as $column) {
        if (Schema::hasColumn('stores', $column)) {
            $store = DB::table('stores')->where($column, $host)->where('status', 'approved')->first();
            if ($store) break;
        }
    }
}

if (!$store) {
    http_response_code(404);header('X-Robots-Tag: noindex');
    readfile(__DIR__ . '/dist/index.html');
    exit;
}

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$canonical = $path === '/' ? 'https://superloja.vip/lojas/'.$store->slug : 'https://superloja.vip'.rtrim($path,'/');
$siteName = 'SuperLojas';
$title = ($store->meta_title ?: $store->name . ' — Loja Online em Angola') . ' | ' . $siteName;
$description = cleanDescription($store->meta_description ?? null, $store->description ?: "Compre produtos da {$store->name} online. Entregas em Angola.");
$image = absoluteMedia($store->banner ?: $store->logo);
$logo = absoluteMedia($store->logo);
$type = 'website';
$productLd = null;

if (preg_match('~^/produto/([^/]+)~', $path, $match)) {
    $product = DB::table('products')->where('store_id', $store->id)->where('slug', $match[1])->where('is_active', true)->first();
    if (!$product) {http_response_code(404);header('X-Robots-Tag: noindex');exit('Produto n�o encontrado');}
    if ($product) {
        $title = $product->name . ' — ' . $store->name . ' | ' . $siteName;
        $description = cleanDescription($product->description ?? null, "Compre {$product->name} na {$store->name}. Entrega em Angola.");
        $images = json_decode($product->images ?? '[]', true) ?: [];
        $image = absoluteMedia($images[0] ?? $store->banner ?? $store->logo);
        $type = 'product';
        $productLd = [
            '@context' => 'https://schema.org', '@type' => 'Product',
            'name' => $product->name, 'description' => $description,
            'image' => [$image], 'sku' => (string)$product->id,
            'brand' => ['@type' => 'Brand', 'name' => $store->name],
            'offers' => [
                '@type' => 'Offer', 'url' => $canonical,
                'priceCurrency' => 'AOA', 'price' => (string)$product->price,
                'availability' => ($product->stock ?? 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                'seller' => ['@type' => 'Organization', 'name' => $store->name],
            ],
        ];
    }
}

$storeLd = [
    '@context' => 'https://schema.org', '@type' => 'OnlineStore', '@id' => 'https://' . $host . '/#store',
    'name' => $store->name, 'url' => 'https://' . $host . '/', 'logo' => $logo,
    'image' => $image, 'description' => $description,
    'telephone' => $store->phone ?: $store->whatsapp,
    'address' => ['@type' => 'PostalAddress', 'addressLocality' => $store->city, 'addressRegion' => $store->province, 'addressCountry' => 'AO'],
    'parentOrganization' => ['@type' => 'Organization', 'name' => $siteName, 'url' => 'https://superloja.vip'],
];

$dist = file_get_contents(__DIR__ . '/dist/index.html');
$head = '<title>' . ehtml($title) . '</title>' . "\n" .
    '<meta name="description" content="' . ehtml($description) . '">' . "\n" .
    '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">' . "\n" .
    '<link rel="canonical" href="' . ehtml($canonical) . '">' . "\n" .
    '<link rel="alternate" hreflang="pt-AO" href="' . ehtml($canonical) . '">' . "\n" .
    '<meta property="og:locale" content="pt_AO"><meta property="og:type" content="' . $type . '">' . "\n" .
    '<meta property="og:site_name" content="' . ehtml($siteName) . '">' . "\n" .
    '<meta property="og:title" content="' . ehtml($title) . '"><meta property="og:description" content="' . ehtml($description) . '">' . "\n" .
    '<meta property="og:url" content="' . ehtml($canonical) . '"><meta property="og:image" content="' . ehtml($image) . '">' . "\n" .
    '<meta property="og:image:alt" content="' . ehtml($title) . '"><meta name="twitter:card" content="summary_large_image">' . "\n" .
    '<meta name="twitter:title" content="' . ehtml($title) . '"><meta name="twitter:description" content="' . ehtml($description) . '"><meta name="twitter:image" content="' . ehtml($image) . '">' . "\n" .
    '<link rel="icon" type="image/x-icon" href="/superloja-favicon-v3.ico"><link rel="apple-touch-icon" href="/superloja-apple-v3.png">' . "\n" .
    '<script type="application/ld+json">' . json_encode($storeLd, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . '</script>' . "\n" .
    ($productLd ? '<script type="application/ld+json">' . json_encode($productLd, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . '</script>' . "\n" : '');

// Replace default generic tags so crawlers receive store-specific HTML immediately.
$dist = preg_replace('~<title>.*?</title>~s', '', $dist);
$dist = preg_replace('~\s*<meta\s+(?:name|property)="(?:description|robots|og:[^"]+|twitter:[^"]+)"[^>]*>~i', '', $dist);
$dist = preg_replace('~\s*<link\s+rel="(?:canonical|icon|apple-touch-icon)"[^>]*>~i', '', $dist);
echo str_replace('</head>', $head . "\n</head>", $dist);
