<?php

namespace App\Http\Controllers\Api\StorePanel;

use App\Http\Controllers\Controller;
use App\Models\PosSale;
use App\Models\Store;
use Illuminate\Http\Request;

class PosController extends Controller
{
    private function getStore(Request $request, string $slug): Store
    {
        $store = Store::where('slug', $slug)->firstOrFail();
        $user = $request->user();
        if ($user->role !== 'super_admin' && !($user->role === 'store_owner' && $user->store_id === $store->id)) {
            abort(403, 'Sem permissao.');
        }

        // Check if plan has POS
        $store->load('plan');
        if (!$store->plan || !$store->plan->has_pos) {
            abort(403, 'O seu plano nao inclui acesso ao POS. Faca upgrade.');
        }

        return $store;
    }

    /**
     * Check POS access (used by frontend to gate the page)
     */
    public function check(Request $request, string $slug)
    {
        $store = Store::where('slug', $slug)->firstOrFail();
        $user = $request->user();
        if ($user->role !== 'super_admin' && !($user->role === 'store_owner' && $user->store_id === $store->id)) {
            abort(403);
        }
        $store->load('plan');
        return response()->json([
            'has_pos' => $store->plan && $store->plan->has_pos,
            'plan_name' => $store->plan ? $store->plan->name : null,
        ]);
    }

    /**
     * Load products for POS (lightweight payload for offline caching)
     */
    public function products(Request $request, string $slug)
    {
        $store = $this->getStore($request, $slug);

        $products = $store->products()
            ->where('stock', '>', 0)
            ->select('id', 'name', 'slug', 'price', 'original_price', 'stock', 'images', 'store_id', 'category')
            ->orderBy('name')
            ->get();

        return response()->json([
            'products' => $products,
            'store' => [
                'id' => $store->id,
                'name' => $store->name,
                'slug' => $store->slug,
                'currency' => 'AOA',
            ],
            'synced_at' => now()->toIso8601String(),
        ]);
    }

    /**
     * Record a sale (or sync offline sales)
     */
    public function sell(Request $request, string $slug)
    {
        $store = $this->getStore($request, $slug);

        $data = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer',
            'items.*.name' => 'required|string',
            'items.*.price' => 'required|numeric|min:0',
            'items.*.qty' => 'required|integer|min:1',
            'items.*.subtotal' => 'required|numeric|min:0',
            'subtotal' => 'required|numeric|min:0',
            'discount' => 'sometimes|numeric|min:0',
            'tax' => 'sometimes|numeric|min:0',
            'total' => 'required|numeric|min:0',
            'payment_method' => 'sometimes|string',
            'amount_received' => 'sometimes|numeric|min:0',
            'change_amount' => 'sometimes|numeric|min:0',
            'customer_name' => 'nullable|string|max:255',
            'customer_phone' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
            'offline_id' => 'nullable|string|max:100',
        ]);

        // Dedup offline syncs
        if (!empty($data['offline_id'])) {
            $existing = PosSale::where('store_id', $store->id)
                ->where('offline_id', $data['offline_id'])
                ->first();
            if ($existing) {
                return response()->json([
                    'message' => 'Venda ja sincronizada.',
                    'sale' => $existing,
                    'duplicate' => true,
                ]);
            }
        }

        $sale = PosSale::create([
            'store_id' => $store->id,
            'user_id' => $request->user()->id,
            'sale_number' => PosSale::nextNumber($store),
            'items' => $data['items'],
            'subtotal' => $data['subtotal'],
            'discount' => $data['discount'] ?? 0,
            'tax' => $data['tax'] ?? 0,
            'total' => $data['total'],
            'payment_method' => $data['payment_method'] ?? 'cash',
            'amount_received' => $data['amount_received'] ?? $data['total'],
            'change_amount' => $data['change_amount'] ?? 0,
            'customer_name' => $data['customer_name'] ?? null,
            'customer_phone' => $data['customer_phone'] ?? null,
            'notes' => $data['notes'] ?? null,
            'currency' => 'AOA',
            'status' => 'completed',
            'offline_id' => $data['offline_id'] ?? null,
        ]);

        // Decrease stock
        foreach ($data['items'] as $item) {
            $store->products()->where('id', $item['product_id'])->decrement('stock', $item['qty']);
        }

        return response()->json([
            'message' => 'Venda registada.',
            'sale' => $sale,
        ], 201);
    }

    /**
     * Bulk sync offline sales
     */
    public function syncOffline(Request $request, string $slug)
    {
        $store = $this->getStore($request, $slug);

        $data = $request->validate([
            'sales' => 'required|array|min:1',
            'sales.*.items' => 'required|array|min:1',
            'sales.*.items.*.product_id' => 'required|integer',
            'sales.*.items.*.name' => 'required|string',
            'sales.*.items.*.price' => 'required|numeric|min:0',
            'sales.*.items.*.qty' => 'required|integer|min:1',
            'sales.*.items.*.subtotal' => 'required|numeric|min:0',
            'sales.*.subtotal' => 'required|numeric|min:0',
            'sales.*.total' => 'required|numeric|min:0',
            'sales.*.offline_id' => 'required|string',
            'sales.*.payment_method' => 'sometimes|string',
            'sales.*.discount' => 'sometimes|numeric|min:0',
            'sales.*.amount_received' => 'sometimes|numeric|min:0',
            'sales.*.change_amount' => 'sometimes|numeric|min:0',
            'sales.*.customer_name' => 'nullable|string',
            'sales.*.customer_phone' => 'nullable|string',
            'sales.*.notes' => 'nullable|string',
        ]);

        $synced = 0;
        $duplicates = 0;

        foreach ($data['sales'] as $s) {
            // Dedup
            if (PosSale::where('store_id', $store->id)->where('offline_id', $s['offline_id'])->exists()) {
                $duplicates++;
                continue;
            }

            PosSale::create([
                'store_id' => $store->id,
                'user_id' => $request->user()->id,
                'sale_number' => PosSale::nextNumber($store),
                'items' => $s['items'],
                'subtotal' => $s['subtotal'],
                'discount' => $s['discount'] ?? 0,
                'tax' => $s['tax'] ?? 0,
                'total' => $s['total'],
                'payment_method' => $s['payment_method'] ?? 'cash',
                'amount_received' => $s['amount_received'] ?? $s['total'],
                'change_amount' => $s['change_amount'] ?? 0,
                'customer_name' => $s['customer_name'] ?? null,
                'customer_phone' => $s['customer_phone'] ?? null,
                'notes' => $s['notes'] ?? null,
                'currency' => 'AOA',
                'status' => 'completed',
                'offline_id' => $s['offline_id'],
            ]);

            foreach ($s['items'] as $item) {
                $store->products()->where('id', $item['product_id'])->decrement('stock', $item['qty']);
            }

            $synced++;
        }

        return response()->json([
            'message' => "{$synced} vendas sincronizadas, {$duplicates} duplicadas ignoradas.",
            'synced' => $synced,
            'duplicates' => $duplicates,
        ]);
    }

    /**
     * Sales history
     */
    public function sales(Request $request, string $slug)
    {
        $store = $this->getStore($request, $slug);

        $query = PosSale::where('store_id', $store->id);

        if ($request->has('date')) {
            $query->whereDate('created_at', $request->date);
        }
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $sales = $query->orderByDesc('created_at')
            ->paginate($request->get('per_page', 20));

        return response()->json($sales);
    }

    /**
     * Void a sale
     */
    public function void(Request $request, string $slug, PosSale $sale)
    {
        $store = $this->getStore($request, $slug);

        if ($sale->store_id !== $store->id) {
            abort(404);
        }
        if ($sale->status === 'voided') {
            return response()->json(['message' => 'Venda ja anulada.'], 422);
        }

        // Restore stock
        foreach ($sale->items as $item) {
            $store->products()->where('id', $item['product_id'])->increment('stock', $item['qty']);
        }

        $sale->update(['status' => 'voided']);

        return response()->json(['message' => 'Venda anulada e stock reposto.']);
    }

    /**
     * Daily summary stats
     */
    public function stats(Request $request, string $slug)
    {
        $store = $this->getStore($request, $slug);
        $date = $request->get('date', now()->toDateString());

        $sales = PosSale::where('store_id', $store->id)
            ->whereDate('created_at', $date)
            ->where('status', 'completed');

        $allTime = PosSale::where('store_id', $store->id)->where('status', 'completed');

        return response()->json([
            'today' => [
                'count' => (clone $sales)->count(),
                'total' => (clone $sales)->sum('total'),
                'cash' => (clone $sales)->where('payment_method', 'cash')->sum('total'),
                'other' => (clone $sales)->where('payment_method', '!=', 'cash')->sum('total'),
            ],
            'all_time' => [
                'count' => (clone $allTime)->count(),
                'total' => (clone $allTime)->sum('total'),
            ],
        ]);
    }
}
