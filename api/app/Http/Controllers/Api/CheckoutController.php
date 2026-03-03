<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Services\MailService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class CheckoutController extends Controller
{
    /**
     * Validate stock, create orders, decrement stock, send confirmation emails.
     */
    public function process(Request $request)
    {
        $data = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'customer' => 'required|array',
            'customer.name' => 'required|string|max:255',
            'customer.email' => 'required|email|max:255',
            'customer.phone' => 'required|string|max:30',
            'customer.address' => 'required|string|max:500',
            'customer.province' => 'required|string|max:100',
            'customer.notes' => 'nullable|string|max:1000',
            'payment_method' => 'nullable|string|max:50',
            'payment_methods' => 'nullable|array',
            'payment_methods.*' => 'string|max:50',
        ]);

        $errors = [];
        $items = $data['items'];
        $customer = $data['customer'];
        $perStorePayments = $data['payment_methods'] ?? [];

        // Collect receipt files keyed by store_id (receipt_<store_id>)
        $receipts = [];
        foreach ($request->allFiles() as $key => $file) {
            if (str_starts_with($key, 'receipt_')) {
                $storeId = str_replace('receipt_', '', $key);
                $receipts[$storeId] = $file;
            }
        }

        // Load products and validate stock
        $products = [];
        foreach ($items as $item) {
            $product = Product::with('store')->find($item['product_id']);
            if (!$product) {
                $errors[] = "Produto #{$item['product_id']} nao encontrado.";
                continue;
            }
            if ($product->stock < $item['quantity']) {
                $errors[] = "\"{$product->name}\" — stock insuficiente (disponivel: {$product->stock}, pedido: {$item['quantity']}).";
            }
            $products[$item['product_id']] = $product;
        }

        if (!empty($errors)) {
            return response()->json([
                'error' => 'Stock insuficiente para alguns produtos.',
                'stock_errors' => $errors,
            ], 422);
        }

        // Group items by store
        $byStore = [];
        foreach ($items as $item) {
            $product = $products[$item['product_id']];
            $storeId = $product->store_id;
            if (!isset($byStore[$storeId])) $byStore[$storeId] = [];
            $byStore[$storeId][] = [
                'product' => $product,
                'quantity' => $item['quantity'],
            ];
        }

        $deliveryPerStore = 2500;
        $createdOrders = [];

        DB::beginTransaction();
        try {
            foreach ($byStore as $storeId => $storeItems) {
                // Calculate subtotal for this store's order
                $subtotal = 0;
                foreach ($storeItems as $si) {
                    $subtotal += $si['product']->price * $si['quantity'];
                }

                // Handle receipt upload for this store
                $receiptPath = null;
                if (isset($receipts[$storeId])) {
                    $receiptPath = '/storage/' . $receipts[$storeId]->store("orders/receipts", 'public');
                }

                $order = Order::create([
                    'order_number' => Order::generateOrderNumber(),
                    'store_id' => $storeId,
                    'user_id' => $request->user()?->id,
                    'customer_name' => $customer['name'],
                    'customer_email' => $customer['email'],
                    'customer_phone' => $customer['phone'],
                    'customer_address' => $customer['address'],
                    'customer_province' => $customer['province'],
                    'customer_notes' => $customer['notes'] ?? null,
                    'payment_method' => $perStorePayments[$storeId] ?? $data['payment_method'] ?? 'multicaixa',
                    'payment_receipt' => $receiptPath,
                    'status' => 'pending',
                    'subtotal' => $subtotal,
                    'delivery_fee' => $deliveryPerStore,
                    'total' => $subtotal + $deliveryPerStore,
                ]);

                foreach ($storeItems as $si) {
                    $product = Product::lockForUpdate()->find($si['product']->id);
                    if ($product->stock < $si['quantity']) {
                        DB::rollBack();
                        return response()->json([
                            'error' => "Stock de \"{$product->name}\" foi alterado. Tente novamente.",
                            'stock_errors' => ["\"{$product->name}\" — stock actual: {$product->stock}"],
                        ], 422);
                    }
                    $product->decrement('stock', $si['quantity']);

                    OrderItem::create([
                        'order_id' => $order->id,
                        'product_id' => $product->id,
                        'product_name' => $product->name,
                        'product_image' => $product->images[0] ?? null,
                        'price' => $product->price,
                        'quantity' => $si['quantity'],
                        'total' => $product->price * $si['quantity'],
                    ]);
                }

                $createdOrders[] = $order->load('items');
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['error' => 'Erro ao processar pedido. Tente novamente.'], 500);
        }

        // Send confirmation email to customer (non-blocking)
        try {
            $mail = new MailService();
            foreach ($createdOrders as $order) {
                $mail->sendOrderConfirmation(
                    $order->customer_email,
                    $order->customer_name,
                    $order
                );
            }
        } catch (\Throwable $e) {}

        // Notify stores about new orders
        try {
            foreach ($createdOrders as $order) {
                $itemCount = $order->items->count();
                $totalFmt = number_format($order->total, 0, ',', '.');
                Notification::notifyStore(
                    $order->store_id,
                    'new_order',
                    "Novo pedido #{$order->order_number}",
                    "{$order->customer_name} fez um pedido de {$itemCount} " . ($itemCount === 1 ? 'item' : 'itens') . " — {$totalFmt} Kz",
                    'shopping-bag', 'amber',
                    '/pedidos'
                );
                Notification::notifyAdmin(
                    'new_order',
                    "Novo pedido #{$order->order_number}",
                    "Pedido de {$order->customer_name} na loja #{$order->store_id} — {$totalFmt} Kz",
                    'shopping-bag', 'amber'
                );
            }
        } catch (\Throwable $e) {}

        $orderNumbers = array_map(fn($o) => $o->order_number, $createdOrders);

        return response()->json([
            'message' => 'Pedido confirmado com sucesso!',
            'success' => true,
            'order_numbers' => $orderNumbers,
            'orders' => $createdOrders,
        ]);
    }

    /**
     * Validate stock for items (check before checkout).
     */
    public function validateStock(Request $request)
    {
        $data = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        $issues = [];
        foreach ($data['items'] as $item) {
            $product = Product::select('id', 'name', 'stock')->find($item['product_id']);
            if (!$product) continue;
            if ($product->stock < $item['quantity']) {
                $issues[] = [
                    'product_id' => $product->id,
                    'name' => $product->name,
                    'requested' => $item['quantity'],
                    'available' => $product->stock,
                ];
            }
        }

        return response()->json([
            'valid' => empty($issues),
            'issues' => $issues,
        ]);
    }
}
