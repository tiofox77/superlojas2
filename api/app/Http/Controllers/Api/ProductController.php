<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::with(['store', 'categoryRelation', 'subcategory']);

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

        $sortBy = $request->get('sort', 'created_at');
        $sortDir = $request->get('dir', 'desc');
        $query->orderBy($sortBy, $sortDir);

        return response()->json($query->get());
    }

    public function show(string $slug)
    {
        $product = Product::with('store')
            ->where('slug', $slug)
            ->firstOrFail();

        return response()->json($product);
    }

    public function trending()
    {
        return response()->json(
            Product::with('store')
                ->orderByDesc('rating')
                ->take(18)
                ->get()
        );
    }

    public function flashSale()
    {
        return response()->json(
            Product::with('store')
                ->whereNotNull('original_price')
                ->where('badge', 'Promo')
                ->get()
        );
    }
}
