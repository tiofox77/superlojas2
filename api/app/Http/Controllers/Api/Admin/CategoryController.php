<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        $query = Category::with('subcategories');

        if ($request->has('search')) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        return response()->json($query->orderBy('name')->get());
    }

    public function show(Category $category)
    {
        return response()->json($category);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|unique:categories',
            'icon' => 'required|string|max:10',
            'product_count' => 'sometimes|integer|min:0',
        ]);

        $category = Category::create($request->all());

        return response()->json($category, 201);
    }

    public function update(Request $request, Category $category)
    {
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'slug' => 'sometimes|string|unique:categories,slug,' . $category->id,
            'icon' => 'sometimes|string|max:10',
            'product_count' => 'sometimes|integer|min:0',
        ]);

        $category->update($request->all());

        return response()->json($category->fresh());
    }

    public function destroy(Category $category)
    {
        $category->delete();

        return response()->json(['message' => 'Categoria eliminada com sucesso.']);
    }
}
