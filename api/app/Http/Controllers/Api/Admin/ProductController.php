<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::with('store');

        if ($request->has('store_id')) {
            $query->where('store_id', $request->store_id);
        }

        if ($request->has('category')) {
            $query->where('category', $request->category);
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

        $perPage = $request->get('per_page', 15);

        return response()->json($query->latest()->paginate($perPage));
    }

    public function show(Product $product)
    {
        return response()->json($product->load('store'));
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|unique:products',
            'price' => 'required|numeric|min:0',
            'original_price' => 'nullable|numeric|min:0',
            'currency' => 'sometimes|string|max:5',
            'images' => 'required',
            'images.*' => 'file|image|max:4096',
            'store_id' => 'required|exists:stores,id',
            'category' => 'required|string',
            'badge' => 'nullable|in:Promo,Novo',
            'rating' => 'sometimes|numeric|min:0|max:5',
            'review_count' => 'sometimes|integer|min:0',
            'stock' => 'required|integer|min:0',
            'description' => 'required|string',
            'variants' => 'sometimes|nullable|array',
        ]);

        $data = $request->except(['images']);

        // Upload imagens
        $imagePaths = [];
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $image) {
                $imagePaths[] = '/storage/' . $image->store("stores/{$data['store_id']}/products", 'public');
            }
        }
        $data['images'] = $imagePaths;

        $product = Product::create($data);

        return response()->json($product->load('store'), 201);
    }

    public function update(Request $request, Product $product)
    {
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'slug' => 'sometimes|string|unique:products,slug,' . $product->id,
            'price' => 'sometimes|numeric|min:0',
            'original_price' => 'sometimes|nullable|numeric|min:0',
            'currency' => 'sometimes|string|max:5',
            'new_images' => 'sometimes',
            'new_images.*' => 'file|image|max:4096',
            'existing_images' => 'sometimes|array',
            'existing_images.*' => 'string',
            'store_id' => 'sometimes|exists:stores,id',
            'category' => 'sometimes|string',
            'badge' => 'sometimes|nullable|in:Promo,Novo',
            'rating' => 'sometimes|numeric|min:0|max:5',
            'review_count' => 'sometimes|integer|min:0',
            'stock' => 'sometimes|integer|min:0',
            'description' => 'sometimes|string',
            'variants' => 'sometimes|nullable|array',
        ]);

        $data = $request->except(['new_images', 'existing_images', 'images']);

        // Manter imagens existentes selecionadas
        $images = $request->input('existing_images', $product->images ?? []);

        // Upload novas imagens
        if ($request->hasFile('new_images')) {
            foreach ($request->file('new_images') as $image) {
                $images[] = '/storage/' . $image->store("stores/{$product->store_id}/products", 'public');
            }
        }

        // Apagar imagens antigas que nao estao na lista de existentes
        $oldImages = $product->images ?? [];
        foreach ($oldImages as $oldImg) {
            if (str_starts_with($oldImg, '/storage/') && !in_array($oldImg, $images)) {
                Storage::disk('public')->delete(str_replace('/storage/', '', $oldImg));
            }
        }

        $data['images'] = $images;

        $product->update($data);

        return response()->json($product->fresh()->load('store'));
    }

    public function destroy(Product $product)
    {
        // Apagar imagens do disco
        if (is_array($product->images)) {
            foreach ($product->images as $img) {
                if (str_starts_with($img, '/storage/')) {
                    Storage::disk('public')->delete(str_replace('/storage/', '', $img));
                }
            }
        }

        $product->delete();

        return response()->json(['message' => 'Produto eliminado com sucesso.']);
    }

    public function bulkDelete(Request $request)
    {
        $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:products,id',
        ]);

        $products = Product::whereIn('id', $request->ids)->get();
        foreach ($products as $p) {
            if (is_array($p->images)) {
                foreach ($p->images as $img) {
                    if (str_starts_with($img, '/storage/')) {
                        Storage::disk('public')->delete(str_replace('/storage/', '', $img));
                    }
                }
            }
            $p->delete();
        }

        return response()->json(['message' => count($request->ids) . ' produto(s) eliminado(s) com sucesso.']);
    }
}
