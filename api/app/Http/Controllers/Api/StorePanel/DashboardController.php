<?php

namespace App\Http\Controllers\Api\StorePanel;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\Order;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request, string $slug)
    {
        $store = Store::where('slug', $slug)
            ->withCount('products')
            ->with(['user', 'plan', 'storeCategories'])
            ->firstOrFail();

        $this->authorizeStoreAccess($request->user(), $store);

        // Auto-migrate legacy JSON categories to pivot if pivot is empty
        if ($store->storeCategories->isEmpty()) {
            $legacyNames = $store->categories ?? [];
            if (!empty($legacyNames)) {
                $slugs = array_map(fn($n) => \Illuminate\Support\Str::slug($n), $legacyNames);
                $resolved = \App\Models\Category::whereIn('name', $legacyNames)
                    ->orWhereIn('slug', $slugs)
                    ->pluck('id')
                    ->toArray();
                if (!empty($resolved)) {
                    $store->storeCategories()->sync($resolved);
                    $store->load('storeCategories');
                }
            }
        }

        $totalProducts = $store->products_count;
        $totalSlides = $store->heroSlides()->count();
        $avgRating = $store->rating;
        $reviewCount = $store->review_count;

        // Orders stats
        $totalOrders = $store->orders()->count();
        $pendingOrders = $store->orders()->where('status', 'pending')->count();
        $revenue = $store->orders()->whereIn('status', ['confirmed', 'processing', 'shipped', 'delivered'])->sum('total');

        // Stock alerts
        $outOfStock = $store->products()->where('stock', '<=', 0)->count();
        $lowStock = $store->products()->where('stock', '>', 0)->where('stock', '<=', 5)->count();

        // Low stock products list
        $lowStockProducts = $store->products()
            ->where('stock', '>', 0)
            ->where('stock', '<=', 5)
            ->orderBy('stock')
            ->take(5)
            ->get(['id', 'name', 'slug', 'stock', 'images', 'price']);

        // Recent orders
        $recentOrders = $store->orders()
            ->with('user:id,name')
            ->latest()
            ->take(5)
            ->get(['id', 'order_number', 'customer_name', 'total', 'status', 'created_at', 'user_id']);

        $plan = $store->plan;
        $hasSubdomain = $plan ? (bool) $plan->custom_domain : false;

        // Override categories with pivot IDs for frontend
        $storeData = $store->toArray();
        $pivotIds = $store->storeCategories->pluck('id')->toArray();
        if (!empty($pivotIds)) {
            $storeData['categories'] = $pivotIds;
        }

        return response()->json([
            'store' => $storeData,
            'plan' => $plan ? [
                'id' => $plan->id,
                'name' => $plan->name,
                'max_products' => $plan->max_products,
                'max_images_per_product' => $plan->max_images_per_product,
                'max_hero_slides' => $plan->max_hero_slides,
                'max_categories' => $plan->max_categories,
                'custom_domain' => (bool) $plan->custom_domain,
                'has_api' => (bool) $plan->has_api,
                'has_pos' => (bool) $plan->has_pos,
                'analytics' => (bool) $plan->analytics,
                'featured_badge' => (bool) $plan->featured_badge,
                'priority_support' => (bool) $plan->priority_support,
            ] : null,
            'has_subdomain' => $hasSubdomain,
            'plan_name' => $plan->name ?? null,
            'stats' => [
                'total_products' => $totalProducts,
                'total_slides' => $totalSlides,
                'rating' => $avgRating,
                'review_count' => $reviewCount,
                'status' => $store->status,
                'total_orders' => $totalOrders,
                'pending_orders' => $pendingOrders,
                'revenue' => $revenue,
                'out_of_stock' => $outOfStock,
                'low_stock' => $lowStock,
            ],
            'recent_products' => $store->products()->latest()->take(5)->get(),
            'low_stock_products' => $lowStockProducts,
            'recent_orders' => $recentOrders,
        ]);
    }

    private function authorizeStoreAccess($user, Store $store): void
    {
        if ($user->role === 'super_admin') return;
        if ($user->role === 'store_owner' && $user->store_id === $store->id) return;
        abort(403, 'Nao tem permissao para aceder a esta loja.');
    }
}
