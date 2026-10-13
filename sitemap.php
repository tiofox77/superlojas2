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
        ->leftJoin('plans', 'stores.plan_id', '=', 'plans.id')
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
        ['loc' => '/ofertas',      'priority' => '0.9', 'changefreq' => 'daily'],
        ['loc' => '/lojas',         'priority' => '0.8', 'changefreq' => 'daily'],
        ['loc' => '/categorias',    'priority' => '0.8', 'changefreq' => 'weekly'],
        ['loc' => '/contacto',      'priority' => '0.5', 'changefreq' => 'monthly'],
        ['loc' => '/faq',           'priority' => '0.6', 'changefreq' => 'monthly'],
        ['loc' => '/como-comprar',  'priority' => '0.6', 'changefreq' => 'monthly'],
        ['loc' => '/termos',        'priority' => '0.3', 'changefreq' => 'yearly'],
        ['loc' => '/privacidade',   'priority' => '0.3', 'changefreq' => 'yearly'],
        ['loc' => '/cadastro-loja', 'priority' => '0.6', 'changefreq' => 'monthly'],
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
        $categories = DB::table('categories')->whereExists(function ($query) {
            $query->select(DB::raw(1))->from('products')
                ->join('stores', 'products.store_id', '=', 'stores.id')
                ->whereColumn('products.category', 'categories.name')
                ->where('products.is_active', true)->where('stores.status', 'approved');
        })->select('slug', 'updated_at')->get();
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

            // Emit only the preferred canonical store URL to avoid duplicates.
            if (false) {
                $subBase = storeSubdomainUrl($store->slug, $domain);
                echo "  <url>\n";
                echo "    <loc>{$subBase}/</loc>\n";
                echo "    <lastmod>{$date}</lastmod>\n";
                echo "    <changefreq>daily</changefreq>\n";
                echo "    <priority>0.8</priority>\n";
                echo "  </url>\n";
            } else {
                echo "  <url>\n";
                echo "    <loc>{$base}/lojas/{$store->slug}</loc>\n";
                echo "    <lastmod>{$date}</lastmod>\n";
                echo "    <changefreq>daily</changefreq>\n";
                echo "    <priority>0.7</priority>\n";
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
            ->leftJoin('plans', 'stores.plan_id', '=', 'plans.id')
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

            // Emit only one canonical URL per product.
            if (false) {
                $subBase = storeSubdomainUrl($p->store_slug, $domain);
                echo "  <url>\n";
                echo "    <loc>{$subBase}/produto/{$p->slug}</loc>\n";
                echo "    <lastmod>{$date}</lastmod>\n";
                echo "    <changefreq>weekly</changefreq>\n";
                echo "    <priority>0.7</priority>\n";
                echo "  </url>\n";
            } else {
                echo "  <url>\n";
                echo "    <loc>{$base}/produto/{$p->slug}</loc>\n";
                echo "    <lastmod>{$date}</lastmod>\n";
                echo "    <changefreq>weekly</changefreq>\n";
                echo "    <priority>0.6</priority>\n";
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
