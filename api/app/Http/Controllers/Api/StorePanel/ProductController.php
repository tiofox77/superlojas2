<?php

namespace App\Http\Controllers\Api\StorePanel;

use App\Helpers\SeoFileName;
use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\Product;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProductController extends Controller
{
    private function getStore(Request $request, string $slug): Store
    {
        $store = Store::where('slug', $slug)->firstOrFail();
        $user = $request->user();
        if ($user->role !== 'super_admin' && !($user->role === 'store_owner' && (int)$store->user_id === (int)$user->id)) {
            abort(403, 'Sem permissao.');
        }
        return $store;
    }

    public function index(Request $request, string $slug)
    {
        $store = $this->getStore($request, $slug);
        $query = $store->products();

        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->has('subcategory_id')) {
            $query->where('subcategory_id', $request->subcategory_id);
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
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")->orWhere('description', 'like', "%{$s}%");
            });
        }

        return response()->json($query->latest()->paginate($request->get('per_page', 15)));
    }

    public function bulkAction(Request $request, string $slug)
    {
        $storeModel = $this->getStore($request, $slug);
        $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer',
            'action' => 'required|in:delete,activate,deactivate',
        ]);

        $ids = $request->ids;
        $action = $request->action;

        // Only act on products belonging to this store
        $query = Product::where('store_id', $storeModel->id)->whereIn('id', $ids);
        $count = $query->count();

        if ($count === 0) {
            return response()->json(['message' => 'Nenhum produto encontrado.'], 404);
        }

        switch ($action) {
            case 'delete':
                $query->delete();
                return response()->json(['message' => "{$count} produto(s) eliminado(s).", 'count' => $count]);
            case 'activate':
                $query->update(['is_active' => true]);
                return response()->json(['message' => "{$count} produto(s) activado(s).", 'count' => $count]);
            case 'deactivate':
                $query->update(['is_active' => false]);
                return response()->json(['message' => "{$count} produto(s) desactivado(s).", 'count' => $count]);
        }
    }

    public function toggleActive(Request $request, string $slug, Product $product)
    {
        $storeModel = $this->getStore($request, $slug);
        if ((int) $product->store_id !== (int) $storeModel->id) abort(403);

        $product->update(['is_active' => !$product->is_active]);

        return response()->json([
            'message' => $product->is_active ? 'Produto activado.' : 'Produto desactivado.',
            'is_active' => $product->is_active,
        ]);
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
            'images.*' => 'file|image|max:10240',
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

        // Pushes go out after the response: broadcast() encrypts and posts one request per subscriber,
        // which kept the seller waiting 8–10 s with no feedback (QA 17-Out) — enough to click twice.
        \Illuminate\Support\defer(fn () => $this->broadcastNewProduct($product, $storeModel, $data, $imagePaths));

        return response()->json($product, 201);
    }

    /** Push notifications for a new product (and its flash sale). Runs after the response is sent. */
    private function broadcastNewProduct(Product $product, $storeModel, array $data, array $imagePaths): void
    {
        // Push notification for new product
        try {
            \App\Services\WebPushService::broadcast(
                'Novo Produto: ' . $product->name,
                ($storeModel->name ?? 'Loja') . ' adicionou um novo produto!',
                null,
                '/produto/' . $product->slug,
                null,
                !empty($imagePaths) ? $imagePaths[0] : null,
                'new-product-' . $product->id
            );
        } catch (\Throwable $e) {
            \Log::warning('Push notification failed for new product', ['error' => $e->getMessage()]);
        }

        // Push notification for flash sale
        if (($data['badge'] ?? null) === 'Promo' && !empty($data['flash_sale_start'])) {
            try {
                \App\Services\WebPushService::broadcast(
                    '⚡ Flash Sale: ' . $product->name,
                    'Aproveite o desconto em ' . ($storeModel->name ?? 'Loja') . '!',
                    null,
                    '/ofertas',
                    null,
                    !empty($imagePaths) ? $imagePaths[0] : null,
                    'flash-sale-' . $product->id
                );
            } catch (\Throwable $e) {
                \Log::warning('Push notification failed for flash sale', ['error' => $e->getMessage()]);
            }
        }
    }

    public function update(Request $request, string $slug, Product $product)
    {
        $storeModel = $this->getStore($request, $slug);
        if ((int) $product->store_id !== (int) $storeModel->id) abort(403);
        $storeModel->load('plan');
        $plan = $storeModel->plan;

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'slug' => 'sometimes|string|unique:products,slug,' . $product->id,
            'price' => 'sometimes|numeric|min:0',
            'original_price' => 'sometimes|nullable|numeric|min:0',
            'new_images' => 'sometimes',
            'new_images.*' => 'file|image|max:10240',
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

        $images = $request->has('_images_updated')
            ? ($request->input('existing_images') ?? [])
            : ($request->input('existing_images', $product->images ?? []));

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
        if ((int) $product->store_id !== (int) $storeModel->id) abort(403);

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

    public function toggleFeatured(Request $request, string $slug, Product $product)
    {
        $storeModel = $this->getStore($request, $slug);
        if ((int) $product->store_id !== (int) $storeModel->id) abort(403);

        if ($product->is_featured) {
            $product->update(['is_featured' => false, 'featured_status' => null]);
            return response()->json(['message' => 'Produto removido de destaque.', 'is_featured' => false, 'featured_status' => null]);
        }

        $product->update(['is_featured' => true, 'featured_status' => 'pending']);

        Notification::notifyAdmin(
            'featured_request',
            'Pedido de Destaque',
            "A loja \"{$storeModel->name}\" solicitou destaque para o produto \"{$product->name}\".",
            'crown',
            'amber',
            '/admin/produtos',
            ['product_id' => $product->id, 'store_id' => $storeModel->id]
        );

        return response()->json(['message' => 'Pedido de destaque enviado. Aguarde aprovacao do admin.', 'is_featured' => true, 'featured_status' => 'pending']);
    }
}
