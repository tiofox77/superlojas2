<?php

namespace App\Http\Controllers\Api\Admin;

use App\Helpers\SeoFileName;
use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Store;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProductController extends Controller
{
    public function checkSlug(Request $request)
    {
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

    public function pendingFeatured()
    {
        $products = Product::with('store:id,name,slug')
            ->where('is_featured', true)
            ->where('featured_status', 'pending')
            ->latest()
            ->get();

        return response()->json($products);
    }

    public function index(Request $request)
    {
        $query = Product::with('store');

        if ($request->has('store_id')) {
            $query->where('store_id', $request->store_id);
        }

        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        } elseif ($request->has('category')) {
            $query->where('category', $request->category);
        }

        if ($request->has('badge')) {
            $query->where('badge', $request->badge);
        }

        if ($request->has('min_price')) {
            $query->where('price', '>=', $request->min_price);
        }

        if ($request->has('max_price')) {
            $query->where('price', '<=', $request->max_price);
        }

        if ($request->has('stock')) {
            $stock = $request->stock;
            if ($stock === 'in_stock') {
                $query->where('stock', '>', 0);
            } elseif ($stock === 'out_of_stock') {
                $query->where('stock', '<=', 0);
            }
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->is_active === 'true' || $request->is_active === '1');
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

    public function toggleActive(Product $product)
    {
        $product->update(['is_active' => !$product->is_active]);

        return response()->json([
            'message' => $product->is_active ? 'Produto activado.' : 'Produto desactivado.',
            'is_active' => $product->is_active,
        ]);
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
            'images.*' => 'file|image|max:10240',
            'store_id' => 'required|exists:stores,id',
            'category' => 'required|string',
            'badge' => 'nullable|in:Promo,Novo,Usado',
            'rating' => 'sometimes|numeric|min:0|max:5',
            'review_count' => 'sometimes|integer|min:0',
            'stock' => 'required|integer|min:0',
            'description' => 'nullable|string',
            'variants' => 'sometimes|nullable|array',
        ]);

        $data = $request->except(['images']);

        // Upload imagens
        $imagePaths = [];
        if ($request->hasFile('images')) {
            $productSlug = $data['slug'] ?? 'produto';
            $store = Store::find($data['store_id']);
            $storeSlug = $store ? $store->slug : 'loja';
            foreach ($request->file('images') as $idx => $image) {
                $suffix = $storeSlug . '-' . ($idx + 1);
                $imagePaths[] = SeoFileName::storePublic($image, "stores/{$data['store_id']}/products", $productSlug, $suffix);
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
            'new_images.*' => 'file|image|max:10240',
            'existing_images' => 'sometimes|array',
            'existing_images.*' => 'string',
            'store_id' => 'sometimes|exists:stores,id',
            'category' => 'sometimes|string',
            'badge' => 'sometimes|nullable|in:Promo,Novo,Usado',
            'rating' => 'sometimes|numeric|min:0|max:5',
            'review_count' => 'sometimes|integer|min:0',
            'stock' => 'sometimes|integer|min:0',
            'description' => 'sometimes|string',
            'variants' => 'sometimes|nullable|array',
        ]);

        $data = $request->except(['new_images', 'existing_images', 'images']);

        // Manter imagens existentes selecionadas
        $images = $request->has('_images_updated')
            ? ($request->input('existing_images') ?? [])
            : ($request->input('existing_images', $product->images ?? []));

        // Upload novas imagens
        if ($request->hasFile('new_images')) {
            $productSlug = $data['slug'] ?? $product->slug ?? 'produto';
            $storeSlug = $product->store ? $product->store->slug : 'loja';
            $existingCount = count($images);
            foreach ($request->file('new_images') as $idx => $image) {
                $suffix = $storeSlug . '-' . ($existingCount + $idx + 1);
                $images[] = SeoFileName::storePublic($image, "stores/{$product->store_id}/products", $productSlug, $suffix);
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

    public function approveFeatured(Product $product)
    {
        $product->update(['featured_status' => 'approved']);

        if ($product->store_id) {
            Notification::notifyStore(
                $product->store_id,
                'featured_approved',
                'Destaque Aprovado',
                "O produto \"{$product->name}\" foi aprovado como destaque e ja esta visivel na plataforma.",
                'check-circle',
                'emerald',
                '/loja/' . ($product->store ? $product->store->slug : '') . '/painel/produtos'
            );
        }

        return response()->json(['message' => "Produto \"{$product->name}\" aprovado como destaque.", 'featured_status' => 'approved']);
    }

    public function rejectFeatured(Product $product)
    {
        $product->update(['is_featured' => false, 'featured_status' => 'rejected']);

        if ($product->store_id) {
            Notification::notifyStore(
                $product->store_id,
                'featured_rejected',
                'Destaque Rejeitado',
                "O pedido de destaque para o produto \"{$product->name}\" foi rejeitado.",
                'x-circle',
                'red',
                '/loja/' . ($product->store ? $product->store->slug : '') . '/painel/produtos'
            );
        }

        return response()->json(['message' => "Destaque do produto \"{$product->name}\" rejeitado.", 'featured_status' => 'rejected']);
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
