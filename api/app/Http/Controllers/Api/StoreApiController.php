<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class StoreApiController extends Controller
{
    private function store(Request $request): Store
    {
        return $request->attributes->get('api_store');
    }

    private function checkPermission(Request $request, string $perm): bool
    {
        $store = $this->store($request);
        $permissions = $store->api_permissions ?? ['read', 'write', 'delete'];
        return in_array($perm, $permissions);
    }

    // ─── Store Info ───────────────────────────────────────────────

    public function info(Request $request)
    {
        $store = $this->store($request);
        return response()->json([
            'id' => $store->id,
            'name' => $store->name,
            'slug' => $store->slug,
            'description' => $store->description,
            'logo' => $store->logo,
            'banner' => $store->banner,
            'province' => $store->province,
            'city' => $store->city,
            'whatsapp' => $store->whatsapp,
            'email' => $store->email,
            'phone' => $store->phone,
            'rating' => $store->rating,
            'review_count' => $store->review_count,
            'status' => $store->status,
            'plan' => $store->plan ? ['name' => $store->plan->name, 'slug' => $store->plan->slug] : null,
            'products_count' => $store->products()->count(),
        ]);
    }

    // ─── Products: List ───────────────────────────────────────────

    public function products(Request $request)
    {
        if (!$this->checkPermission($request, 'read')) {
            return response()->json(['error' => 'Sem permissao de leitura.'], 403);
        }

        $store = $this->store($request);
        $query = $store->products();

        // Filters
        if ($request->has('category')) {
            $query->where('category', $request->category);
        }
        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }
        if ($request->has('badge')) {
            $query->where('badge', $request->badge);
        }
        if ($request->has('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }
        if ($request->has('in_stock')) {
            $query->where('stock', '>', 0);
        }

        // Sort
        $sortField = $request->get('sort', 'created_at');
        $sortDir = $request->get('order', 'desc');
        $allowed = ['name', 'price', 'stock', 'created_at', 'updated_at'];
        if (in_array($sortField, $allowed)) {
            $query->orderBy($sortField, $sortDir === 'asc' ? 'asc' : 'desc');
        }

        // Pagination
        $perPage = min((int) $request->get('per_page', 25), 100);

        return response()->json($query->paginate($perPage));
    }

    // ─── Products: Show single ────────────────────────────────────

    public function productShow(Request $request, $slug, $productId)
    {
        if (!$this->checkPermission($request, 'read')) {
            return response()->json(['error' => 'Sem permissao de leitura.'], 403);
        }

        $store = $this->store($request);
        $product = $store->products()->findOrFail($productId);

        return response()->json($product);
    }

    // ─── Products: Create ─────────────────────────────────────────

    public function productStore(Request $request)
    {
        if (!$this->checkPermission($request, 'write')) {
            return response()->json(['error' => 'Sem permissao de escrita.'], 403);
        }

        $store = $this->store($request);

        // Check plan product limit
        $plan = $store->plan;
        if ($plan && $plan->max_products > 0) {
            $currentCount = $store->products()->count();
            if ($currentCount >= $plan->max_products) {
                return response()->json([
                    'error' => "Limite de produtos atingido ({$plan->max_products}). Faca upgrade do plano.",
                    'current' => $currentCount,
                    'limit' => $plan->max_products,
                ], 422);
            }
        }

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'original_price' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'category' => 'nullable|string',
            'category_id' => 'nullable|integer|exists:categories,id',
            'subcategory_id' => 'nullable|integer|exists:subcategories,id',
            'stock' => 'sometimes|integer|min:0',
            'badge' => 'nullable|in:Novo,Promo',
            'images' => 'nullable|array',
            'images.*' => 'string',
        ]);

        $data['store_id'] = $store->id;
        $data['slug'] = Str::slug($data['name']);
        $data['stock'] = $data['stock'] ?? 0;
        $data['images'] = $data['images'] ?? [];

        // Ensure slug uniqueness
        $base = $data['slug'];
        $i = 1;
        while (Product::where('slug', $data['slug'])->exists()) {
            $data['slug'] = $base . '-' . $i++;
        }

        $product = Product::create($data);

        return response()->json($product, 201);
    }

    // ─── Products: Update ─────────────────────────────────────────

    public function productUpdate(Request $request, $slug, $productId)
    {
        if (!$this->checkPermission($request, 'write')) {
            return response()->json(['error' => 'Sem permissao de escrita.'], 403);
        }

        $store = $this->store($request);
        $product = $store->products()->findOrFail($productId);

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'price' => 'sometimes|numeric|min:0',
            'original_price' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'category' => 'nullable|string',
            'category_id' => 'nullable|integer|exists:categories,id',
            'subcategory_id' => 'nullable|integer|exists:subcategories,id',
            'stock' => 'sometimes|integer|min:0',
            'badge' => 'nullable|in:Novo,Promo',
            'images' => 'nullable|array',
            'images.*' => 'string',
        ]);

        if (isset($data['name']) && $data['name'] !== $product->name) {
            $data['slug'] = Str::slug($data['name']);
            $base = $data['slug'];
            $i = 1;
            while (Product::where('slug', $data['slug'])->where('id', '!=', $product->id)->exists()) {
                $data['slug'] = $base . '-' . $i++;
            }
        }

        $product->update($data);

        return response()->json($product);
    }

    // ─── Products: Delete ─────────────────────────────────────────

    public function productDestroy(Request $request, $slug, $productId)
    {
        if (!$this->checkPermission($request, 'delete')) {
            return response()->json(['error' => 'Sem permissao de eliminacao.'], 403);
        }

        $store = $this->store($request);
        $product = $store->products()->findOrFail($productId);
        $product->delete();

        return response()->json(['message' => 'Produto eliminado com sucesso.']);
    }

    // ─── Categories (read-only) ───────────────────────────────────

    public function categories(Request $request)
    {
        if (!$this->checkPermission($request, 'read')) {
            return response()->json(['error' => 'Sem permissao de leitura.'], 403);
        }

        $categories = \App\Models\Category::with('subcategories:id,category_id,name,slug')
            ->select('id', 'name', 'slug', 'icon')
            ->orderBy('name')
            ->get();

        return response()->json($categories);
    }
}
