<?php

namespace App\Http\Controllers\Api\StorePanel;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\Plan;
use App\Models\Store;
use App\Models\Subscription;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
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

    /**
     * Current subscription + plan info
     */
    public function current(Request $request, string $slug)
    {
        $store = $this->getStore($request, $slug);
        $store->load(['plan', 'activeSubscription.plan']);

        $active = $store->activeSubscription;
        $plan = $store->plan;

        return response()->json([
            'plan' => $plan ? [
                'id' => $plan->id,
                'name' => $plan->name,
                'slug' => $plan->slug,
                'price' => $plan->price,
                'billing_cycle' => $plan->billing_cycle,
                'is_free' => $plan->is_free,
                'max_products' => $plan->max_products,
                'max_images_per_product' => $plan->max_images_per_product,
                'max_hero_slides' => $plan->max_hero_slides,
                'features' => $plan->features,
                'priority_support' => $plan->priority_support,
                'featured_badge' => $plan->featured_badge,
                'analytics' => $plan->analytics,
                'custom_domain' => $plan->custom_domain,
                'has_api' => $plan->has_api,
            ] : null,
            'subscription' => $active ? [
                'id' => $active->id,
                'status' => $active->status,
                'starts_at' => $active->starts_at,
                'expires_at' => $active->expires_at,
                'auto_renew' => $active->auto_renew,
                'days_remaining' => $active->daysRemaining(),
                'payment_method' => $active->payment_method,
                'amount_paid' => $active->amount_paid,
                'paid_at' => $active->paid_at,
            ] : null,
            'usage' => [
                'products' => $store->products()->count(),
                'max_products' => $plan ? $plan->max_products : 0,
            ],
        ]);
    }

    /**
     * Available plans for upgrade
     */
    public function plans(Request $request, string $slug)
    {
        $store = $this->getStore($request, $slug);
        $plans = Plan::where('is_active', true)->orderBy('sort_order')->get();

        return response()->json($plans->map(function ($plan) use ($store) {
            return [
                'id' => $plan->id,
                'name' => $plan->name,
                'slug' => $plan->slug,
                'price' => $plan->price,
                'billing_cycle' => $plan->billing_cycle,
                'description' => $plan->description,
                'features' => $plan->features,
                'is_free' => $plan->is_free,
                'is_recommended' => $plan->is_recommended,
                'max_products' => $plan->max_products,
                'max_images_per_product' => $plan->max_images_per_product,
                'max_hero_slides' => $plan->max_hero_slides,
                'has_api' => $plan->has_api,
                'is_current' => $store->plan_id === $plan->id,
            ];
        }));
    }

    /**
     * Request upgrade (store owner requests, admin approves)
     */
    public function requestUpgrade(Request $request, string $slug)
    {
        $store = $this->getStore($request, $slug);

        $data = $request->validate([
            'plan_id' => 'required|exists:plans,id',
            'payment_method' => 'nullable|string',
            'payment_method_id' => 'nullable|integer',
            'payment_proof' => 'nullable|file|mimes:jpg,jpeg,png,webp,pdf|max:5120',
            'notes' => 'nullable|string',
        ]);

        $plan = Plan::findOrFail($data['plan_id']);

        if ($plan->is_free) {
            return response()->json(['error' => 'Use o endpoint de downgrade para o plano gratuito.'], 422);
        }

        // Check if there's already a pending request
        $pending = Subscription::where('store_id', $store->id)
            ->where('status', 'pending')
            ->first();

        if ($pending) {
            return response()->json([
                'error' => 'Ja existe um pedido de subscricao pendente.',
                'pending_plan' => $pending->plan->name,
            ], 422);
        }

        // Handle file upload
        $proofPath = null;
        if ($request->hasFile('payment_proof')) {
            $proofPath = '/storage/' . $request->file('payment_proof')->store('payment-proofs', 'public');
        }

        $subscription = Subscription::create([
            'store_id' => $store->id,
            'plan_id' => $plan->id,
            'status' => 'pending',
            'auto_renew' => true,
            'payment_method' => $data['payment_method'] ?? null,
            'payment_proof' => $proofPath,
            'amount_paid' => $plan->price,
            'currency' => 'AOA',
            'notes' => $data['notes'] ?? null,
        ]);

        // Notificar admin
        Notification::notifyAdmin(
            'subscription_request',
            'Novo pedido de subscricao',
            "A loja \"{$store->name}\" solicitou o plano {$plan->name} ({$plan->price} Kz). Metodo: " . ($data['payment_method'] ?? 'N/A') . ".",
            'credit-card',
            'amber',
            '/admin/subscricoes',
            [
                'store_id' => $store->id,
                'store_name' => $store->name,
                'plan_id' => $plan->id,
                'plan_name' => $plan->name,
                'amount' => $plan->price,
                'payment_method' => $data['payment_method'] ?? null,
                'has_proof' => !empty($proofPath),
                'subscription_id' => $subscription->id,
            ]
        );

        return response()->json([
            'message' => "Pedido de subscricao para o plano '{$plan->name}' enviado. Aguarde aprovacao do administrador.",
            'subscription' => $subscription->load('plan:id,name,slug,price'),
        ], 201);
    }

    /**
     * Downgrade to free plan
     */
    public function downgrade(Request $request, string $slug)
    {
        $store = $this->getStore($request, $slug);
        $freePlan = Plan::where('is_free', true)->first();

        if (!$freePlan) {
            return response()->json(['error' => 'Plano gratuito nao encontrado.'], 500);
        }

        if ($store->plan_id === $freePlan->id) {
            return response()->json(['error' => 'Ja esta no plano gratuito.'], 422);
        }

        // Cancel active subscription
        Subscription::where('store_id', $store->id)
            ->where('status', 'active')
            ->update(['status' => 'cancelled', 'cancelled_at' => now()]);

        // Cancel pending
        Subscription::where('store_id', $store->id)
            ->where('status', 'pending')
            ->update(['status' => 'cancelled', 'cancelled_at' => now()]);

        // Create free subscription
        Subscription::create([
            'store_id' => $store->id,
            'plan_id' => $freePlan->id,
            'status' => 'active',
            'starts_at' => now(),
            'expires_at' => null,
            'auto_renew' => false,
            'amount_paid' => 0,
            'currency' => 'AOA',
            'paid_at' => now(),
            'notes' => 'Downgrade para plano gratuito',
        ]);

        $store->update([
            'plan_id' => $freePlan->id,
            'plan_expires_at' => null,
        ]);

        return response()->json(['message' => 'Plano alterado para Gratuito.']);
    }

    /**
     * Subscription history
     */
    public function history(Request $request, string $slug)
    {
        $store = $this->getStore($request, $slug);

        $subs = Subscription::where('store_id', $store->id)
            ->with('plan:id,name,slug,price,billing_cycle')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($subs);
    }

    /**
     * Toggle auto-renew
     */
    public function toggleAutoRenew(Request $request, string $slug)
    {
        $store = $this->getStore($request, $slug);
        $active = Subscription::where('store_id', $store->id)->where('status', 'active')->latest()->first();

        if (!$active) {
            return response()->json(['error' => 'Nenhuma subscricao activa.'], 422);
        }

        $active->update(['auto_renew' => !$active->auto_renew]);

        return response()->json([
            'message' => $active->auto_renew ? 'Renovacao automatica activada.' : 'Renovacao automatica desactivada.',
            'auto_renew' => $active->auto_renew,
        ]);
    }
}
