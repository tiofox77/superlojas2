<?php
/**
 * Dynamic XML Sitemap for SuperLojas
 * Generates sitemap index or individual sitemaps.
 * Supports store subdomains (e.g. sexyshop.superloja.vip).
 *
 * Routes (via .htaccess):
 *   /sitemap.xml          → sitemap index (links to sub-sitemaps)
 *   /sitemap-main.xml     → static pages + categories
 *   /sitemap-stores.xml   → all approved stores (main domain + subdomain URLs)
 *   /sitemap-products.xml → all active products (main domain + subdomain URLs)
 */

require __DIR__ . '/api/vendor/autoload.php';
$app = require_once __DIR__ . '/api/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

header('Content-Type: application/xml; charset=utf-8');
header('Cache-Control: public, max-age=3600');

$base = 'https://superloja.vip';
$domain = 'superloja.vip';
$now = date('Y-m-d');

// Determine which sitemap to serve based on query param
$type = $_GET['type'] ?? 'index';

// ─── Helper: build store subdomain base URL ───
function storeSubdomainUrl(string $slug, string $domain): string {
    return "https://{$slug}.{$domain}";
}

// ─── Helper: get stores with subdomain info ───
function getStoresWithSubdomain(): \Illuminate\Support\Collection {
    return DB::table('stores')
        ->join('plans', 'stores.plan_id', '=', 'plans.id')
        ->where('stores.status', 'approved')
        ->select(
            'stores.slug',
            'stores.updated_at',
            'plans.custom_domain as has_subdomain'
        )
        ->get();
}

// ─── SITEMAP INDEX ───
if ($type === 'index') {
    echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
    echo '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

    $sitemaps = [
        'sitemap-main.xml',
        'sitemap-stores.xml',
        'sitemap-products.xml',
    ];
    foreach ($sitemaps as $sm) {
        echo "  <sitemap>\n";
        echo "    <loc>{$base}/{$sm}</loc>\n";
        echo "    <lastmod>{$now}</lastmod>\n";
        echo "  </sitemap>\n";
    }

    // Per-store sub-sitemaps for stores with subdomains
    try {
        $subStores = DB::table('stores')
            ->join('plans', 'stores.plan_id', '=', 'plans.id')
            ->where('stores.status', 'approved')
            ->where('plans.custom_domain', true)
            ->select('stores.slug', 'stores.updated_at')
            ->get();
        foreach ($subStores as $st) {
            $date = $st->updated_at ? date('Y-m-d', strtotime($st->updated_at)) : $now;
            echo "  <sitemap>\n";
            echo "    <loc>{$base}/sitemap-store-{$st->slug}.xml</loc>\n";
            echo "    <lastmod>{$date}</lastmod>\n";
            echo "  </sitemap>\n";
        }
    } catch (Exception $e) {}

    echo '</sitemapindex>' . "\n";
    exit;
}

// ─── Start urlset for non-index sitemaps ───
echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

// ─── MAIN SITEMAP (static pages + categories) ───
if ($type === 'main') {
    $staticPages = [
        ['loc' => '/',              'priority' => '1.0', 'changefreq' => 'daily'],
        ['loc' => '/produtos',      'priority' => '0.9', 'changefreq' => 'daily'],
        ['loc' => '/lojas',         'priority' => '0.8', 'changefreq' => 'daily'],
        ['loc' => '/categorias',    'priority' => '0.8', 'changefreq' => 'weekly'],
        ['loc' => '/contacto',      'priority' => '0.5', 'changefreq' => 'monthly'],
        ['loc' => '/sobre',         'priority' => '0.5', 'changefreq' => 'monthly'],
        ['loc' => '/login',         'priority' => '0.4', 'changefreq' => 'monthly'],
        ['loc' => '/registar',      'priority' => '0.5', 'changefreq' => 'monthly'],
        ['loc' => '/registar-loja', 'priority' => '0.6', 'changefreq' => 'monthly'],
    ];

    foreach ($staticPages as $page) {
        echo "  <url>\n";
        echo "    <loc>{$base}{$page['loc']}</loc>\n";
        echo "    <lastmod>{$now}</lastmod>\n";
        echo "    <changefreq>{$page['changefreq']}</changefreq>\n";
        echo "    <priority>{$page['priority']}</priority>\n";
        echo "  </url>\n";
    }

    try {
        $categories = DB::table('categories')->select('slug', 'updated_at')->get();
        foreach ($categories as $cat) {
            $date = $cat->updated_at ? date('Y-m-d', strtotime($cat->updated_at)) : $now;
            echo "  <url>\n";
            echo "    <loc>{$base}/categoria/{$cat->slug}</loc>\n";
            echo "    <lastmod>{$date}</lastmod>\n";
            echo "    <changefreq>weekly</changefreq>\n";
            echo "    <priority>0.7</priority>\n";
            echo "  </url>\n";
        }
    } catch (Exception $e) {}
}

// ─── STORES SITEMAP ───
if ($type === 'stores') {
    try {
        $stores = getStoresWithSubdomain();
        foreach ($stores as $store) {
            $date = $store->updated_at ? date('Y-m-d', strtotime($store->updated_at)) : $now;

            // Main domain URL: /loja/{slug}
            echo "  <url>\n";
            echo "    <loc>{$base}/loja/{$store->slug}</loc>\n";
            echo "    <lastmod>{$date}</lastmod>\n";
            echo "    <changefreq>daily</changefreq>\n";
            echo "    <priority>0.7</priority>\n";
            echo "  </url>\n";

            // Subdomain URL: {slug}.superloja.vip
            if ($store->has_subdomain) {
                $subBase = storeSubdomainUrl($store->slug, $domain);
                echo "  <url>\n";
                echo "    <loc>{$subBase}/</loc>\n";
                echo "    <lastmod>{$date}</lastmod>\n";
                echo "    <changefreq>daily</changefreq>\n";
                echo "    <priority>0.8</priority>\n";
                echo "  </url>\n";
            }
        }
    } catch (Exception $e) {}
}

// ─── PRODUCTS SITEMAP ───
if ($type === 'products') {
    try {
        $products = DB::table('products')
            ->join('stores', 'products.store_id', '=', 'stores.id')
            ->join('plans', 'stores.plan_id', '=', 'plans.id')
            ->where('products.is_active', true)
            ->where('stores.status', 'approved')
            ->select(
                'stores.slug as store_slug',
                'products.slug',
                'products.updated_at',
                'plans.custom_domain as has_subdomain'
            )
            ->orderBy('products.updated_at', 'desc')
            ->limit(10000)
            ->get();
        foreach ($products as $p) {
            $date = $p->updated_at ? date('Y-m-d', strtotime($p->updated_at)) : $now;

            // Main domain: /loja/{store}/produto/{product}
            echo "  <url>\n";
            echo "    <loc>{$base}/loja/{$p->store_slug}/produto/{$p->slug}</loc>\n";
            echo "    <lastmod>{$date}</lastmod>\n";
            echo "    <changefreq>weekly</changefreq>\n";
            echo "    <priority>0.6</priority>\n";
            echo "  </url>\n";

            // Subdomain: {store}.superloja.vip/produto/{product}
            if ($p->has_subdomain) {
                $subBase = storeSubdomainUrl($p->store_slug, $domain);
                echo "  <url>\n";
                echo "    <loc>{$subBase}/produto/{$p->slug}</loc>\n";
                echo "    <lastmod>{$date}</lastmod>\n";
                echo "    <changefreq>weekly</changefreq>\n";
                echo "    <priority>0.7</priority>\n";
                echo "  </url>\n";
            }
        }
    } catch (Exception $e) {}
}

// ─── PER-STORE SUBDOMAIN SITEMAP ───
if ($type === 'store' && !empty($_GET['slug'])) {
    $slug = preg_replace('/[^a-z0-9\-]/', '', strtolower($_GET['slug']));
    $subBase = storeSubdomainUrl($slug, $domain);

    // Store homepage
    echo "  <url>\n";
    echo "    <loc>{$subBase}/</loc>\n";
    echo "    <lastmod>{$now}</lastmod>\n";
    echo "    <changefreq>daily</changefreq>\n";
    echo "    <priority>1.0</priority>\n";
    echo "  </url>\n";

    // Store products on subdomain
    try {
        $storeProducts = DB::table('products')
            ->join('stores', 'products.store_id', '=', 'stores.id')
            ->where('stores.slug', $slug)
            ->where('stores.status', 'approved')
            ->where('products.is_active', true)
            ->select('products.slug', 'products.updated_at')
            ->orderBy('products.updated_at', 'desc')
            ->limit(5000)
            ->get();

        foreach ($storeProducts as $p) {
            $date = $p->updated_at ? date('Y-m-d', strtotime($p->updated_at)) : $now;
            echo "  <url>\n";
            echo "    <loc>{$subBase}/produto/{$p->slug}</loc>\n";
            echo "    <lastmod>{$date}</lastmod>\n";
            echo "    <changefreq>weekly</changefreq>\n";
            echo "    <priority>0.8</priority>\n";
            echo "  </url>\n";
        }
    } catch (Exception $e) {}
}

echo '</urlset>' . "\n";
