<?php

namespace App\Http\Controllers\Api\StorePanel;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProductController extends Controller
{
    private function getStore(Request $request, string $slug): Store
    {
        $store = Store::where('slug', $slug)->firstOrFail();
        $user = $request->user();
        if ($user->role !== 'super_admin' && !($user->role === 'store_owner' && $user->store_id === $store->id)) {
            abort(403, 'Sem permissao.');
        }
        return $store;
    }

    public function index(Request $request, string $slug)
    {
        $store = $this->getStore($request, $slug);
        $query = $store->products();

        if ($request->has('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")->orWhere('description', 'like', "%{$s}%");
            });
        }

        return response()->json($query->latest()->paginate($request->get('per_page', 15)));
    }

    public function store(Request $request, string $slug)
    {
        $storeModel = $this->getStore($request, $slug);

        $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|unique:products',
            'price' => 'required|numeric|min:0',
            'original_price' => 'nullable|numeric|min:0',
            'currency' => 'sometimes|string|max:5',
            'images' => 'required',
            'images.*' => 'file|image|max:4096',
            'category' => 'required|string',
            'category_id' => 'nullable|exists:categories,id',
            'subcategory_id' => 'nullable|exists:subcategories,id',
            'badge' => 'nullable|in:Promo,Novo',
            'stock' => 'required|integer|min:0',
            'description' => 'required|string',
            'variants' => 'sometimes|nullable|array',
        ]);

        $data = $request->except(['images']);
        $data['store_id'] = $storeModel->id;

        $imagePaths = [];
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $image) {
                $imagePaths[] = '/storage/' . $image->store("stores/{$storeModel->id}/products", 'public');
            }
        }
        $data['images'] = $imagePaths;

        $product = Product::create($data);

        return response()->json($product, 201);
    }

    public function update(Request $request, string $slug, Product $product)
    {
        $storeModel = $this->getStore($request, $slug);
        if ($product->store_id !== $storeModel->id) abort(403);

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'slug' => 'sometimes|string|unique:products,slug,' . $product->id,
            'price' => 'sometimes|numeric|min:0',
            'original_price' => 'sometimes|nullable|numeric|min:0',
            'new_images' => 'sometimes',
            'new_images.*' => 'file|image|max:4096',
            'existing_images' => 'sometimes|array',
            'existing_images.*' => 'string',
            'category' => 'sometimes|string',
            'category_id' => 'sometimes|nullable|exists:categories,id',
            'subcategory_id' => 'sometimes|nullable|exists:subcategories,id',
            'badge' => 'sometimes|nullable|in:Promo,Novo',
            'stock' => 'sometimes|integer|min:0',
            'description' => 'sometimes|string',
        ]);

        $data = $request->except(['new_images', 'existing_images', 'images']);
        $images = $request->input('existing_images', $product->images ?? []);

        if ($request->hasFile('new_images')) {
            foreach ($request->file('new_images') as $image) {
                $images[] = '/storage/' . $image->store("stores/{$storeModel->id}/products", 'public');
            }
        }

        $oldImages = $product->images ?? [];
        foreach ($oldImages as $old) {
            if (str_starts_with($old, '/storage/') && !in_array($old, $images)) {
                Storage::disk('public')->delete(str_replace('/storage/', '', $old));
            }
        }

        $data['images'] = $images;
        $product->update($data);

        return response()->json($product->fresh());
    }

    public function destroy(Request $request, string $slug, Product $product)
    {
        $storeModel = $this->getStore($request, $slug);
        if ($product->store_id !== $storeModel->id) abort(403);

        if (is_array($product->images)) {
            foreach ($product->images as $img) {
                if (str_starts_with($img, '/storage/')) {
                    Storage::disk('public')->delete(str_replace('/storage/', '', $img));
                }
            }
        }

        $product->delete();
        return response()->json(['message' => 'Produto eliminado.']);
    }
}
