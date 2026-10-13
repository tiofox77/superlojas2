<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    /**
     * Slim store fields for product listings (avoids sending full store object per product).
     */
    private static array $storeListFields = ['id', 'name', 'slug', 'logo', 'province', 'city', 'whatsapp', 'status', 'is_official'];

    /**
     * Allowed sort columns to prevent SQL injection.
     */
    private static array $allowedSorts = ['created_at', 'price', 'name', 'rating', 'stock', 'review_count'];

    public function index(Request $request)
    {
        $query = Product::with([
                'store' => fn ($q) => $q->select(self::$storeListFields),
                'categoryRelation:id,name,slug',
                'subcategory:id,name,slug',
            ])
            ->where('is_active', true)
            ->whereHas('store', fn ($q) => $q->where('status', 'approved'));

        // ─── Filters ─────────────────────────────────────
        if ($request->has('category')) {
            $query->where('category', $request->category);
        }
        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }
        if ($request->has('subcategory_id')) {
            $query->where('subcategory_id', $request->subcategory_id);
        }
        if ($request->has('store_id')) {
            $query->where('store_id', $request->store_id);
        }
        if ($request->has('badge')) {
            $query->where('badge', $request->badge);
        }
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }
        if ($request->has('min_price')) {
            $query->where('price', '>=', $request->min_price);
        }
        if ($request->has('max_price')) {
            $query->where('price', '<=', $request->max_price);
        }

        // New filters
        if ($request->has('in_stock')) {
            $query->where('stock', '>', 0);
        }
        if ($request->has('out_of_stock')) {
            $query->where('stock', '<=', 0);
        }
        if ($request->has('has_image')) {
            $query->where(function ($q) {
                $q->whereNotNull('images')
                  ->where('images', '!=', '[]')
                  ->where('images', '!=', 'null');
            });
        }
        if ($request->has('featured')) {
            $query->where('is_featured', true)->where('featured_status', 'approved');
        }

        // ─── Sorting ─────────────────────────────────────
        $sortBy = $request->get('sort', 'created_at');
        if (!in_array($sortBy, self::$allowedSorts)) $sortBy = 'created_at';
        $sortDir = strtolower($request->get('dir', 'desc')) === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sortBy, $sortDir);

        // ─── Pagination ──────────────────────────────────
        $perPage = min((int) $request->get('per_page', 24), 100);
        $paginated = $query->paginate($perPage);

        // Standardize currency on output
        $paginated->getCollection()->transform(function ($product) {
            if ($product->currency && strtolower($product->currency) !== 'usd') {
                $product->currency = 'Kz';
            }
            return $product;
        });

        return response()->json($paginated);
    }

    public function show(string $slug)
    {
        $product = Product::with(['store', 'categoryRelation:id,name,slug', 'subcategory:id,name,slug'])
            ->where('slug', $slug)
            ->where('is_active', true)
            ->firstOrFail();

        // Standardize currency
        if ($product->currency && strtolower($product->currency) !== 'usd') {
            $product->currency = 'Kz';
        }

        return response()->json($product);
    }

    public function trending()
    {
        $products = Product::with(['store' => fn ($q) => $q->select(self::$storeListFields)])
            ->where('is_active', true)
            ->whereHas('store', fn($q) => $q->where('status', 'approved'))
            ->selectRaw('products.*, (CAST(rating AS DECIMAL(3,1)) * 2 + review_count + CASE WHEN created_at > NOW() - INTERVAL 7 DAY THEN 10 WHEN created_at > NOW() - INTERVAL 30 DAY THEN 5 ELSE 0 END) as trend_score')
            ->orderByDesc('trend_score')
            ->take(18)
            ->get();

        $products->each(fn ($p) => $p->currency = ($p->currency && strtolower($p->currency) !== 'usd') ? 'Kz' : $p->currency);

        return response()->json($products);
    }

    public function latest()
    {
        $products = Product::with(['store' => fn ($q) => $q->select(self::$storeListFields)])
            ->where('is_active', true)
            ->whereHas('store', fn($q) => $q->where('status', 'approved'))
            ->latest()
            ->take(18)
            ->get();

        $products->each(fn ($p) => $p->currency = ($p->currency && strtolower($p->currency) !== 'usd') ? 'Kz' : $p->currency);

        return response()->json($products);
    }

    public function featured()
    {
        $products = Product::with(['store' => fn ($q) => $q->select(self::$storeListFields)])
            ->where('is_active', true)
            ->where('is_featured', true)
            ->where('featured_status', 'approved')
            ->whereHas('store', fn($q) => $q->where('status', 'approved'))
            ->latest()
            ->take(18)
            ->get();

        $products->each(fn ($p) => $p->currency = ($p->currency && strtolower($p->currency) !== 'usd') ? 'Kz' : $p->currency);

        return response()->json($products);
    }

    public function flashSale()
    {
        $products = Product::with(['store' => fn ($q) => $q->select(self::$storeListFields)])
            ->where('is_active', true)
            ->whereHas('store', fn($q) => $q->where('status', 'approved'))
            ->whereNotNull('original_price')
            ->where('badge', 'Promo')
            ->where(function ($q) {
                $q->whereNull('flash_sale_end')
                  ->orWhere('flash_sale_end', '>', now());
            })
            ->get();

        $products->each(fn ($p) => $p->currency = ($p->currency && strtolower($p->currency) !== 'usd') ? 'Kz' : $p->currency);

        return response()->json($products);
    }
}
