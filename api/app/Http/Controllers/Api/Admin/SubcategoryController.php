<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Subcategory;
use Illuminate\Http\Request;

class SubcategoryController extends Controller
{
    public function index(Request $request)
    {
        $query = Subcategory::with('category');

        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        return response()->json($query->orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'category_id' => 'required|exists:categories,id',
            'name' => 'required|string|max:255',
            'slug' => 'required|string',
        ]);

        $exists = Subcategory::where('category_id', $request->category_id)
            ->where('slug', $request->slug)->exists();
        if ($exists) {
            return response()->json(['message' => 'Slug ja existe nesta categoria.'], 422);
        }

        $sub = Subcategory::create($request->only(['category_id', 'name', 'slug']));

        return response()->json($sub->load('category'), 201);
    }

    public function update(Request $request, Subcategory $subcategory)
    {
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'slug' => 'sometimes|string',
        ]);

        if ($request->has('slug') && $request->slug !== $subcategory->slug) {
            $exists = Subcategory::where('category_id', $subcategory->category_id)
                ->where('slug', $request->slug)->where('id', '!=', $subcategory->id)->exists();
            if ($exists) {
                return response()->json(['message' => 'Slug ja existe nesta categoria.'], 422);
            }
        }

        $subcategory->update($request->only(['name', 'slug']));

        return response()->json($subcategory->fresh()->load('category'));
    }

    public function destroy(Subcategory $subcategory)
    {
        $subcategory->delete();
        return response()->json(['message' => 'Subcategoria eliminada com sucesso.']);
    }
}
