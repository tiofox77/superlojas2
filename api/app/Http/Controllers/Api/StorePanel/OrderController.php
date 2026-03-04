<?php

namespace App\Http\Controllers\Api\StorePanel;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\Order;
use App\Models\Store;
use App\Services\MailService;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    private function getStore(string $slug): Store
    {
        return Store::where('slug', $slug)->firstOrFail();
    }

    /**
     * List orders for this store.
     */
    public function index(Request $request, string $slug)
    {
        $store = $this->getStore($slug);
        $query = Order::with('items')
            ->where('store_id', $store->id)
            ->orderByDesc('created_at');

        if ($request->has('type') && in_array($request->type, ['order', 'preorder'])) {
            $query->where('type', $request->type);
        }
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }
        if ($request->has('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('order_number', 'like', "%{$s}%")
                  ->orWhere('customer_name', 'like', "%{$s}%")
                  ->orWhere('customer_email', 'like', "%{$s}%")
                  ->orWhere('customer_phone', 'like', "%{$s}%");
            });
        }

        return response()->json(
            $query->paginate($request->get('per_page', 20))
        );
    }

    /**
     * Order stats for dashboard.
     */
    public function stats(string $slug)
    {
        $store = $this->getStore($slug);
        $base = Order::where('store_id', $store->id);

        return response()->json([
            'total_orders' => (clone $base)->where('type', 'order')->count(),
            'total_preorders' => (clone $base)->where('type', 'preorder')->count(),
            'total' => (clone $base)->count(),
            'pending' => (clone $base)->where('status', 'pending')->count(),
            'confirmed' => (clone $base)->where('status', 'confirmed')->count(),
            'processing' => (clone $base)->where('status', 'processing')->count(),
            'shipped' => (clone $base)->where('status', 'shipped')->count(),
            'delivered' => (clone $base)->where('status', 'delivered')->count(),
            'cancelled' => (clone $base)->where('status', 'cancelled')->count(),
            'revenue' => (clone $base)->whereIn('status', ['confirmed', 'processing', 'shipped', 'delivered'])->sum('total'),
            'today' => (clone $base)->whereDate('created_at', today())->count(),
        ]);
    }

    /**
     * Show single order.
     */
    public function show(string $slug, Order $order)
    {
        $store = $this->getStore($slug);
        abort_if($order->store_id !== $store->id, 403);

        return response()->json($order->load('items'));
    }

    /**
     * Update order status.
     */
    public function updateStatus(Request $request, string $slug, Order $order)
    {
        $store = $this->getStore($slug);
        abort_if($order->store_id !== $store->id, 403);

        $data = $request->validate([
            'status' => 'required|in:pending,confirmed,processing,shipped,delivered,cancelled',
            'cancel_reason' => 'nullable|string|max:500',
            'admin_notes' => 'nullable|string|max:1000',
        ]);

        $previousStatus = $order->status;
        $newStatus = $data['status'];

        if ($previousStatus === $newStatus) {
            return response()->json(['message' => 'Estado ja esta definido.'], 422);
        }

        $updateData = ['status' => $newStatus];

        // Set timestamps based on status
        if ($newStatus === 'confirmed') $updateData['confirmed_at'] = now();
        if ($newStatus === 'shipped') $updateData['shipped_at'] = now();
        if ($newStatus === 'delivered') $updateData['delivered_at'] = now();
        if ($newStatus === 'cancelled') {
            $updateData['cancelled_at'] = now();
            $updateData['cancel_reason'] = $data['cancel_reason'] ?? null;
        }
        if (isset($data['admin_notes'])) {
            $updateData['admin_notes'] = $data['admin_notes'];
        }

        $order->update($updateData);

        // Send status update email to customer
        try {
            (new MailService())->sendOrderStatusUpdate(
                $order->customer_email,
                $order->customer_name,
                $order->load('store'),
                $previousStatus,
                $data['cancel_reason'] ?? ''
            );
        } catch (\Throwable $e) {}

        // Notify admin about status change
        try {
            $statusLabels = [
                'pending' => 'Pendente', 'confirmed' => 'Confirmado', 'processing' => 'Em Preparacao',
                'shipped' => 'Enviado', 'delivered' => 'Entregue', 'cancelled' => 'Cancelado',
            ];
            Notification::notifyAdmin(
                'order_status',
                "Pedido #{$order->order_number} — {$statusLabels[$newStatus]}",
                "A loja actualizou o pedido #{$order->order_number} para: {$statusLabels[$newStatus]}",
                'package', 'blue'
            );
        } catch (\Throwable $e) {}

        return response()->json([
            'message' => "Pedido #{$order->order_number} actualizado para: " . $order->status_label,
            'order' => $order->fresh()->load('items'),
        ]);
    }
}
