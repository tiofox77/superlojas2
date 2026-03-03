<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class ClientPanelController extends Controller
{
    /**
     * Dashboard summary for the customer.
     */
    public function dashboard(Request $request)
    {
        $user = $request->user();
        $userScope = function ($q) use ($user) {
            $q->where('user_id', $user->id)->orWhere('customer_email', $user->email);
        };

        $totalOrders = Order::where($userScope)->count();
        $pendingOrders = Order::where($userScope)->where('status', 'pending')->count();
        $deliveredOrders = Order::where($userScope)->where('status', 'delivered')->count();
        $totalSpent = Order::where($userScope)->whereNotIn('status', ['cancelled'])->sum('total');

        $recentOrders = Order::where($userScope)
            ->with(['items', 'store:id,name,slug,logo'])
            ->latest()
            ->take(5)
            ->get();

        return response()->json([
            'stats' => [
                'total_orders' => $totalOrders,
                'pending_orders' => $pendingOrders,
                'delivered_orders' => $deliveredOrders,
                'total_spent' => round($totalSpent, 2),
            ],
            'recent_orders' => $recentOrders,
        ]);
    }

    /**
     * List all orders for the customer.
     */
    public function orders(Request $request)
    {
        $user = $request->user();
        $query = Order::where(function ($q) use ($user) {
            $q->where('user_id', $user->id)
              ->orWhere('customer_email', $user->email);
        })->with(['items', 'store:id,name,slug,logo']);

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->has('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('order_number', 'like', "%{$s}%")
                  ->orWhereHas('store', function ($sq) use ($s) {
                      $sq->where('name', 'like', "%{$s}%");
                  });
            });
        }

        return response()->json(
            $query->latest()->paginate($request->get('per_page', 10))
        );
    }

    /**
     * Show a single order detail.
     */
    public function orderShow(Request $request, Order $order)
    {
        if ($order->user_id !== $request->user()->id) {
            abort(403, 'Sem permissao.');
        }

        return response()->json(
            $order->load(['items', 'store:id,name,slug,logo'])
        );
    }

    /**
     * Get profile data.
     */
    public function profile(Request $request)
    {
        return response()->json($request->user());
    }

    /**
     * Update profile.
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'sometimes|nullable|string|max:30',
            'avatar' => 'sometimes|nullable|file|image|max:2048',
        ]);

        if ($request->has('name')) $user->name = $request->name;
        if ($request->has('phone')) $user->phone = $request->phone;

        if ($request->hasFile('avatar')) {
            if ($user->avatar && str_starts_with($user->avatar, '/storage/')) {
                Storage::disk('public')->delete(str_replace('/storage/', '', $user->avatar));
            }
            $user->avatar = '/storage/' . $request->file('avatar')->store("users/{$user->id}/avatars", 'public');
        }

        $user->save();

        return response()->json(['message' => 'Perfil actualizado.', 'user' => $user]);
    }

    /**
     * Change password.
     */
    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|string|min:6|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'Palavra-passe actual incorrecta.'], 422);
        }

        $user->update(['password' => Hash::make($request->password)]);

        return response()->json(['message' => 'Palavra-passe alterada com sucesso.']);
    }

    /**
     * Get addresses (stored as JSON on user).
     */
    public function addresses(Request $request)
    {
        $user = $request->user();
        return response()->json($user->addresses ?? []);
    }

    /**
     * Save addresses.
     */
    public function saveAddresses(Request $request)
    {
        $request->validate([
            'addresses' => 'required|array|max:5',
            'addresses.*.label' => 'required|string|max:50',
            'addresses.*.name' => 'required|string|max:255',
            'addresses.*.phone' => 'required|string|max:30',
            'addresses.*.address' => 'required|string|max:500',
            'addresses.*.province' => 'required|string|max:100',
            'addresses.*.city' => 'nullable|string|max:100',
            'addresses.*.is_default' => 'sometimes|boolean',
        ]);

        $user = $request->user();
        $user->addresses = $request->addresses;
        $user->save();

        return response()->json(['message' => 'Enderecos guardados.', 'addresses' => $user->addresses]);
    }
}
