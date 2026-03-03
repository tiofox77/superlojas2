<?php

namespace App\Http\Controllers\Api\StorePanel;

use App\Http\Controllers\Controller;
use App\Models\Store;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request, string $slug)
    {
        $store = Store::where('slug', $slug)
            ->withCount('products')
            ->with(['user', 'plan'])
            ->firstOrFail();

        $this->authorizeStoreAccess($request->user(), $store);

        $totalProducts = $store->products_count;
        $totalSlides = $store->heroSlides()->count();
        $avgRating = $store->rating;
        $reviewCount = $store->review_count;

        return response()->json([
            'store' => $store,
            'stats' => [
                'total_products' => $totalProducts,
                'total_slides' => $totalSlides,
                'rating' => $avgRating,
                'review_count' => $reviewCount,
                'status' => $store->status,
            ],
            'recent_products' => $store->products()->latest()->take(5)->get(),
        ]);
    }

    private function authorizeStoreAccess($user, Store $store): void
    {
        if ($user->role === 'super_admin') return;
        if ($user->role === 'store_owner' && $user->store_id === $store->id) return;
        abort(403, 'Nao tem permissao para aceder a esta loja.');
    }
}
