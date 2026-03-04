<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PreOrderController extends Controller
{
    /**
     * Create a pre-order (encomenda) for an out-of-stock product.
     * No authentication required — any visitor can place a pre-order.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'product_id' => 'required|integer|exists:products,id',
            'quantity' => 'required|integer|min:1',
            'selected_variants' => 'nullable|array',
            'customer.name' => 'required|string|max:255',
            'customer.email' => 'required|email|max:255',
            'customer.phone' => 'required|string|max:30',
            'customer.province' => 'required|string|max:100',
            'customer.notes' => 'nullable|string|max:1000',
        ]);

        $product = Product::with('store')->findOrFail($data['product_id']);
        $store = $product->store;
        $customer = $data['customer'];
        $quantity = $data['quantity'];
        $selectedVariants = $data['selected_variants'] ?? null;
        $subtotal = $product->price * $quantity;

        DB::beginTransaction();
        try {
            $order = Order::create([
                'order_number' => Order::generateOrderNumber(),
                'type' => 'preorder',
                'store_id' => $store->id,
                'user_id' => $request->user()?->id,
                'customer_name' => $customer['name'],
                'customer_email' => $customer['email'],
                'customer_phone' => $customer['phone'],
                'customer_address' => '',
                'customer_province' => $customer['province'],
                'customer_notes' => $customer['notes'] ?? null,
                'payment_method' => 'pending',
                'status' => 'pending',
                'subtotal' => $subtotal,
                'delivery_fee' => 0,
                'total' => $subtotal,
            ]);

            OrderItem::create([
                'order_id' => $order->id,
                'product_id' => $product->id,
                'product_name' => $product->name,
                'product_image' => $product->images[0] ?? null,
                'price' => $product->price,
                'quantity' => $quantity,
                'selected_variants' => $selectedVariants,
                'total' => $subtotal,
            ]);

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['error' => 'Erro ao processar encomenda. Tente novamente.'], 500);
        }

        // Notify the store
        try {
            $variantStr = '';
            if ($selectedVariants) {
                $parts = [];
                foreach ($selectedVariants as $k => $v) {
                    $parts[] = "{$k}: {$v}";
                }
                $variantStr = ' (' . implode(', ', $parts) . ')';
            }

            Notification::notifyStore(
                $store->id,
                'preorder',
                "Nova encomenda #{$order->order_number}",
                "{$customer['name']} encomendou {$quantity}x {$product->name}{$variantStr}",
                'package',
                'purple',
                '/pedidos'
            );

            Notification::notifyAdmin(
                'preorder',
                "Nova encomenda #{$order->order_number}",
                "{$customer['name']} encomendou {$product->name} na loja {$store->name}",
                'package',
                'purple'
            );
        } catch (\Throwable $e) {}

        return response()->json([
            'message' => 'Encomenda registada com sucesso! A loja entrara em contacto consigo.',
            'success' => true,
            'order_number' => $order->order_number,
        ], 201);
    }
}
