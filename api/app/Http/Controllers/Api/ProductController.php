<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Services\ProductDemand;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

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
            // Match the legacy text column or the category relation (name or slug), so renaming a
            // category (e.g. "Electronica" -> "Electrónica") never empties its page.
            $category = (string) $request->category;
            $query->where(function ($q) use ($category) {
                $q->where('category', $category)
                  ->orWhereHas('categoryRelation', fn ($c) => $c->where('name', $category)->orWhere('slug', $category));
            });
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

        // Site search = demand signal: count the term and credit the first results (once per visitor/term/day).
        $term = ProductDemand::normalise((string) $request->query('search', ''));
        if (mb_strlen($term) >= 2 && $paginated->currentPage() === 1) {
            $demand = app(ProductDemand::class);
            if ($demand->firstToday('search|' . $request->ip() . '|' . $term)) {
                $demand->recordSearch($term, 'site', $paginated->total());
                foreach ($paginated->getCollection()->take(5) as $product) {
                    $demand->record($product->id, $product->store_id, 'search_hits');
                }
            }
        }

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

    /**
     * Home "Produtos em Destaque": most asked on WhatsApp and most searched / viewed in the last
     * 30 days (see ProductDemand), in stock only. Approved paid highlights get a small boost and
     * fill the list, followed by trending products, while there is little demand data.
     */
    public function popular(ProductDemand $demand)
    {
        $limit = 10;
        $ids = Cache::remember('products:popular:v1', 600, function () use ($demand, $limit) {
            $scores = $demand->scores(30);
            $visible = fn () => Product::query()
                ->where('is_active', true)
                ->where('stock', '>', 0)
                ->whereHas('store', fn ($q) => $q->where('status', 'approved'));

            $ranked = $scores
                ? $visible()->whereIn('id', array_keys($scores))
                    ->get(['id', 'is_featured', 'featured_status'])
                    ->sortByDesc(fn ($p) => $scores[$p->id] + ($p->is_featured && $p->featured_status === 'approved' ? 10 : 0))
                    ->pluck('id')
                : collect();

            if ($ranked->count() < $limit) {
                $fill = $visible()
                    ->whereNotIn('id', $ranked->all())
                    ->orderByRaw("CASE WHEN is_featured = 1 AND featured_status = 'approved' THEN 0 ELSE 1 END")
                    ->orderByRaw('(CAST(rating AS DECIMAL(3,1)) * 2 + review_count) DESC')
                    ->latest()
                    ->take($limit - $ranked->count())
                    ->pluck('id');
                $ranked = $ranked->concat($fill);
            }

            return $ranked->take($limit)->values()->all();
        });

        $products = Product::with(['store' => fn ($q) => $q->select(self::$storeListFields)])
            ->whereIn('id', $ids)
            ->where('is_active', true)
            ->where('stock', '>', 0)
            ->get()
            ->sortBy(fn ($p) => array_search($p->id, $ids))
            ->values();

        $products->each(fn ($p) => $p->currency = ($p->currency && strtolower($p->currency) !== 'usd') ? 'Kz' : $p->currency);

        return response()->json($products);
    }

    /**
     * Demand events from the site: WhatsApp button clicks and cart adds (once per visitor/product/type/day).
     */
    public function interest(Request $request, ProductDemand $demand, int $product)
    {
        $data = $request->validate(['type' => 'required|in:whatsapp,cart']);
        $row = Product::where('id', $product)->where('is_active', true)->first(['id', 'store_id']);
        if (!$row) return response()->json(['recorded' => false], 404);

        $field = $data['type'] === 'whatsapp' ? 'whatsapp_clicks' : 'cart_adds';
        $recorded = $demand->firstToday("{$field}|{$request->ip()}|{$row->id}");
        if ($recorded) $demand->record($row->id, $row->store_id, $field);

        return response()->json(['recorded' => $recorded]);
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
