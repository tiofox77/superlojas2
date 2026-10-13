<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;

class CategoryController extends Controller
{
    public function index()
    {
        $categories = Category::with('subcategories')
            ->withCount(['products as real_product_count' => function ($q) {
                $q->where('is_active', true)
                  ->whereHas('store', fn ($s) => $s->where('status', 'approved'));
            }])
            ->get()
            ->each(function ($cat) {
                $cat->product_count = $cat->real_product_count;
                unset($cat->real_product_count);
                // Also update subcategory counts
                $cat->subcategories->each(function ($sub) {
                    $sub->product_count = $sub->products()
                        ->where('is_active', true)
                        ->whereHas('store', fn ($s) => $s->where('status', 'approved'))
                        ->count();
                });
            });

        return response()->json($categories);
    }

    public function show(string $slug)
    {
        $category = Category::where('slug', $slug)
            ->with('subcategories')
            ->withCount(['products as real_product_count' => function ($q) {
                $q->where('is_active', true)
                  ->whereHas('store', fn ($s) => $s->where('status', 'approved'));
            }])
            ->firstOrFail();

        $category->product_count = $category->real_product_count;
        unset($category->real_product_count);

        $category->subcategories->each(function ($sub) {
            $sub->product_count = $sub->products()
                ->where('is_active', true)
                ->whereHas('store', fn ($s) => $s->where('status', 'approved'))
                ->count();
        });

        return response()->json($category);
    }
}
