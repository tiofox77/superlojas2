<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;

class CategoryController extends Controller
{
    public function index()
    {
        return response()->json(Category::with('subcategories')->get());
    }

    public function show(string $slug)
    {
        $category = Category::where('slug', $slug)->with('subcategories')->firstOrFail();
        return response()->json($category);
    }
}
