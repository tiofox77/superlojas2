<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Store;
use App\Models\StoreFollow;
use Illuminate\Http\Request;

class FollowController extends Controller
{
    /**
     * Follow a store.
     */
    public function follow(Request $request, Store $store)
    {
        $user = $request->user();

        // Prevent following own store
        if ($user->store_id === $store->id) {
            return response()->json(['message' => 'Nao pode seguir a sua propria loja.'], 422);
        }

        $user->followedStores()->syncWithoutDetaching([$store->id]);

        return response()->json([
            'message' => 'Loja seguida com sucesso.',
            'is_following' => true,
            'followers_count' => $store->followers()->count(),
        ]);
    }

    /**
     * Unfollow a store.
     */
    public function unfollow(Request $request, Store $store)
    {
        $request->user()->followedStores()->detach($store->id);

        return response()->json([
            'message' => 'Deixou de seguir a loja.',
            'is_following' => false,
            'followers_count' => $store->followers()->count(),
        ]);
    }

    /**
     * Check if user follows a store.
     */
    public function status(Request $request, Store $store)
    {
        $isFollowing = $request->user()->followedStores()->where('store_id', $store->id)->exists();

        return response()->json([
            'is_following' => $isFollowing,
            'followers_count' => $store->followers()->count(),
        ]);
    }

    /**
     * List stores the user follows.
     */
    public function following(Request $request)
    {
        $stores = $request->user()
            ->followedStores()
            ->where('status', 'approved')
            ->withCount('products', 'followers')
            ->latest('store_follows.created_at')
            ->get();

        return response()->json($stores);
    }

    /**
     * Feed: recent products from followed stores.
     */
    public function feed(Request $request)
    {
        $user = $request->user();
        $followedIds = $user->followedStores()->pluck('stores.id');

        if ($followedIds->isEmpty()) {
            return response()->json([
                'data' => [],
                'current_page' => 1,
                'last_page' => 1,
                'total' => 0,
            ]);
        }

        $products = Product::with('store')
            ->whereIn('store_id', $followedIds)
            ->latest()
            ->paginate($request->get('per_page', 20));

        return response()->json($products);
    }

    /**
     * Public: get follower count for a store (no auth needed).
     */
    public function publicCount(Store $store)
    {
        return response()->json([
            'followers_count' => $store->followers()->count(),
        ]);
    }
}
