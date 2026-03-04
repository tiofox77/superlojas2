<?php

namespace App\Http\Controllers\Api\StorePanel;

use App\Helpers\SeoFileName;
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

    public function checkSlug(Request $request, string $slug)
    {
        $this->getStore($request, $slug);
        $productSlug = $request->query('slug', '');
        $excludeId = $request->query('exclude');
        $exists = Product::where('slug', $productSlug)
            ->when($excludeId, fn($q) => $q->where('id', '!=', $excludeId))
            ->exists();

        $suggestion = null;
        if ($exists) {
            $base = preg_replace('/-\d+$/', '', $productSlug);
            for ($i = 2; $i <= 50; $i++) {
                $candidate = $base . '-' . $i;
                if (!Product::where('slug', $candidate)->exists()) {
                    $suggestion = $candidate;
                    break;
                }
            }
        }

        return response()->json(['available' => !$exists, 'suggestion' => $suggestion]);
    }

    public function store(Request $request, string $slug)
    {
        $storeModel = $this->getStore($request, $slug);
        $storeModel->load('plan');
        $plan = $storeModel->plan;

        // Enforce max_products (0 = unlimited, super_admin bypasses)
        if ($plan && $request->user()->role !== 'super_admin') {
            $maxProducts = $plan->max_products;
            if ($maxProducts > 0) {
                $currentCount = $storeModel->products()->count();
                if ($currentCount >= $maxProducts) {
                    return response()->json([
                        'message' => "O seu plano ({$plan->name}) permite no maximo {$maxProducts} produto(s). Faca upgrade para adicionar mais.",
                        'limit' => $maxProducts,
                        'current' => $currentCount,
                    ], 422);
                }
            }
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|unique:products',
            'price' => 'required|numeric|min:0',
            'original_price' => 'nullable|numeric|min:0',
            'currency' => 'sometimes|string|max:5',
            'images' => 'required',
            'images.*' => 'file|image|max:6144',
            'category' => 'required|string',
            'category_id' => 'nullable|exists:categories,id',
            'subcategory_id' => 'nullable|exists:subcategories,id',
            'badge' => 'nullable|in:Promo,Novo,Usado',
            'stock' => 'required|integer|min:0',
            'description' => 'nullable|string',
            'variants' => 'sometimes|nullable',
            'flash_sale_start' => 'nullable|date',
            'flash_sale_end' => 'nullable|date|after_or_equal:flash_sale_start',
        ]);

        // Enforce max_images_per_product (super_admin bypasses)
        if ($request->user()->role !== 'super_admin') {
            $maxImages = $plan ? $plan->max_images_per_product : 5;
            if ($maxImages > 0 && $request->hasFile('images') && count($request->file('images')) > $maxImages) {
                return response()->json([
                    'message' => "O seu plano permite no maximo {$maxImages} imagem(ns) por produto.",
                    'limit' => $maxImages,
                ], 422);
            }
        }

        $data = $request->except(['images']);
        $data['store_id'] = $storeModel->id;

        // Parse variants if sent as JSON string (FormData)
        if (isset($data['variants']) && is_string($data['variants'])) {
            $data['variants'] = json_decode($data['variants'], true);
        }

        // Clear flash sale fields if not Promo
        if (($data['badge'] ?? null) !== 'Promo') {
            $data['flash_sale_start'] = null;
            $data['flash_sale_end'] = null;
        }

        $imagePaths = [];
        if ($request->hasFile('images')) {
            $productSlug = $data['slug'] ?? 'produto';
            foreach ($request->file('images') as $idx => $image) {
                $suffix = $storeModel->slug . '-' . ($idx + 1);
                $imagePaths[] = SeoFileName::storePublic($image, "stores/{$storeModel->id}/products", $productSlug, $suffix);
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
        $storeModel->load('plan');
        $plan = $storeModel->plan;

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'slug' => 'sometimes|string|unique:products,slug,' . $product->id,
            'price' => 'sometimes|numeric|min:0',
            'original_price' => 'sometimes|nullable|numeric|min:0',
            'new_images' => 'sometimes',
            'new_images.*' => 'file|image|max:6144',
            'existing_images' => 'sometimes|array',
            'existing_images.*' => 'string',
            'category' => 'sometimes|string',
            'category_id' => 'sometimes|nullable|exists:categories,id',
            'subcategory_id' => 'sometimes|nullable|exists:subcategories,id',
            'badge' => 'sometimes|nullable|in:Promo,Novo,Usado',
            'stock' => 'sometimes|integer|min:0',
            'description' => 'sometimes|string',
            'variants' => 'sometimes|nullable',
            'flash_sale_start' => 'sometimes|nullable|date',
            'flash_sale_end' => 'sometimes|nullable|date|after_or_equal:flash_sale_start',
        ]);

        $data = $request->except(['new_images', 'existing_images', 'images']);

        // Parse variants if sent as JSON string (FormData)
        if (isset($data['variants']) && is_string($data['variants'])) {
            $data['variants'] = json_decode($data['variants'], true);
        }

        // Clear flash sale fields if not Promo
        if (($data['badge'] ?? null) !== 'Promo') {
            $data['flash_sale_start'] = null;
            $data['flash_sale_end'] = null;
        }

        $images = $request->input('existing_images', $product->images ?? []);

        if ($request->hasFile('new_images')) {
            $productSlug = $data['slug'] ?? $product->slug ?? 'produto';
            $existingCount = count($images);
            foreach ($request->file('new_images') as $idx => $image) {
                $suffix = $storeModel->slug . '-' . ($existingCount + $idx + 1);
                $images[] = SeoFileName::storePublic($image, "stores/{$storeModel->id}/products", $productSlug, $suffix);
            }
        }

        // Enforce max_images_per_product on total images (super_admin bypasses)
        if ($request->user()->role !== 'super_admin') {
            $maxImages = $plan ? $plan->max_images_per_product : 5;
            if ($maxImages > 0 && count($images) > $maxImages) {
                return response()->json([
                    'message' => "O seu plano permite no maximo {$maxImages} imagem(ns) por produto. Tem " . count($images) . " imagens.",
                    'limit' => $maxImages,
                ], 422);
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
