<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\Store;
use App\Models\Subscription;
use App\Services\MailService;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    /**
     * List all subscriptions (with filters)
     */
    public function index(Request $request)
    {
        $query = Subscription::with(['store:id,name,slug,logo', 'plan:id,name,slug,price,billing_cycle,is_free']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        if ($request->has('store_id')) {
            $query->where('store_id', $request->store_id);
        }
        if ($request->has('plan_id')) {
            $query->where('plan_id', $request->plan_id);
        }
        if ($request->has('expiring_soon')) {
            $query->where('status', 'active')
                  ->where('expires_at', '<=', now()->addDays(7))
                  ->where('expires_at', '>', now());
        }

        return response()->json(
            $query->orderByDesc('created_at')->paginate($request->get('per_page', 20))
        );
    }

    /**
     * Create / activate a subscription for a store (admin manually assigns)
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'store_id' => 'required|exists:stores,id',
            'plan_id' => 'required|exists:plans,id',
            'payment_method' => 'nullable|string',
            'payment_reference' => 'nullable|string',
            'amount_paid' => 'nullable|numeric|min:0',
            'auto_renew' => 'sometimes|boolean',
            'notes' => 'nullable|string',
            'status' => 'sometimes|in:active,pending,trial',
        ]);

        $store = Store::findOrFail($data['store_id']);
        $plan = Plan::findOrFail($data['plan_id']);

        // Cancel any current active subscription
        Subscription::where('store_id', $store->id)
            ->where('status', 'active')
            ->update(['status' => 'cancelled', 'cancelled_at' => now()]);

        $status = $data['status'] ?? ($plan->is_free ? 'active' : 'pending');
        $startsAt = $status === 'active' ? now() : null;
        $expiresAt = $status === 'active' ? Subscription::calcExpiry($plan) : null;

        $subscription = Subscription::create([
            'store_id' => $store->id,
            'plan_id' => $plan->id,
            'status' => $status,
            'starts_at' => $startsAt,
            'expires_at' => $expiresAt,
            'auto_renew' => $data['auto_renew'] ?? true,
            'payment_method' => $data['payment_method'] ?? null,
            'payment_reference' => $data['payment_reference'] ?? null,
            'amount_paid' => $data['amount_paid'] ?? $plan->price,
            'currency' => 'AOA',
            'paid_at' => $status === 'active' ? now() : null,
            'notes' => $data['notes'] ?? null,
        ]);

        // Sync store plan
        $store->update([
            'plan_id' => $plan->id,
            'plan_expires_at' => $expiresAt,
        ]);

        return response()->json($subscription->load(['store:id,name,slug', 'plan:id,name,slug,price']), 201);
    }

    /**
     * Show single subscription
     */
    public function show(Subscription $subscription)
    {
        return response()->json(
            $subscription->load(['store:id,name,slug,logo', 'plan:id,name,slug,price,billing_cycle,is_free'])
        );
    }

    /**
     * Activate a pending subscription (admin confirms payment)
     */
    public function activate(Request $request, Subscription $subscription)
    {
        if ($subscription->status === 'active') {
            return response()->json(['message' => 'Subscricao ja esta activa.'], 422);
        }

        $data = $request->validate([
            'payment_method' => 'nullable|string',
            'payment_reference' => 'nullable|string',
            'amount_paid' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $plan = $subscription->plan;

        // Cancel any other active sub for this store
        Subscription::where('store_id', $subscription->store_id)
            ->where('id', '!=', $subscription->id)
            ->where('status', 'active')
            ->update(['status' => 'cancelled', 'cancelled_at' => now()]);

        $subscription->update([
            'status' => 'active',
            'starts_at' => now(),
            'expires_at' => Subscription::calcExpiry($plan),
            'payment_method' => $data['payment_method'] ?? $subscription->payment_method,
            'payment_reference' => $data['payment_reference'] ?? $subscription->payment_reference,
            'amount_paid' => $data['amount_paid'] ?? $subscription->amount_paid,
            'paid_at' => now(),
            'notes' => $data['notes'] ?? $subscription->notes,
        ]);

        // Sync store plan
        $subscription->store->update([
            'plan_id' => $plan->id,
            'plan_expires_at' => $subscription->expires_at,
        ]);

        // Send subscription activated email
        try {
            $owner = $subscription->store->user;
            if ($owner) {
                (new MailService())->sendSubscriptionActivated(
                    $owner->email, $owner->name, $subscription->store->name,
                    $plan->name, $subscription->expires_at->format('d/m/Y')
                );
            }
        } catch (\Throwable $e) {}

        return response()->json([
            'message' => 'Subscricao activada com sucesso.',
            'subscription' => $subscription->fresh()->load(['store:id,name,slug', 'plan:id,name,slug,price']),
        ]);
    }

    /**
     * Cancel a subscription
     */
    public function cancel(Subscription $subscription)
    {
        if ($subscription->status === 'cancelled' || $subscription->status === 'expired') {
            return response()->json(['message' => 'Subscricao ja esta cancelada/expirada.'], 422);
        }

        $subscription->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
            'auto_renew' => false,
        ]);

        // Downgrade to free plan
        $freePlan = Plan::where('is_free', true)->first();
        if ($freePlan) {
            $subscription->store->update([
                'plan_id' => $freePlan->id,
                'plan_expires_at' => null,
            ]);
        }

        return response()->json(['message' => 'Subscricao cancelada. Loja revertida para plano gratuito.']);
    }

    /**
     * Renew an active or expired subscription
     */
    public function renew(Request $request, Subscription $subscription)
    {
        $data = $request->validate([
            'payment_method' => 'nullable|string',
            'payment_reference' => 'nullable|string',
            'amount_paid' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $plan = $subscription->plan;

        // Start from expiry if still active, else from now
        $from = ($subscription->expires_at && $subscription->expires_at->isFuture())
            ? $subscription->expires_at
            : now();

        $newExpiry = Subscription::calcExpiry($plan, $from);

        // Create new subscription record (history)
        $newSub = Subscription::create([
            'store_id' => $subscription->store_id,
            'plan_id' => $plan->id,
            'status' => 'active',
            'starts_at' => $from,
            'expires_at' => $newExpiry,
            'auto_renew' => $subscription->auto_renew,
            'payment_method' => $data['payment_method'] ?? $subscription->payment_method,
            'payment_reference' => $data['payment_reference'] ?? null,
            'amount_paid' => $data['amount_paid'] ?? $plan->price,
            'currency' => 'AOA',
            'paid_at' => now(),
            'notes' => $data['notes'] ?? 'Renovacao',
        ]);

        // Mark old as expired
        if ($subscription->id !== $newSub->id) {
            $subscription->update(['status' => 'expired']);
        }

        // Sync store
        $subscription->store->update([
            'plan_id' => $plan->id,
            'plan_expires_at' => $newExpiry,
        ]);

        return response()->json([
            'message' => 'Subscricao renovada com sucesso.',
            'subscription' => $newSub->load(['store:id,name,slug', 'plan:id,name,slug,price']),
        ]);
    }

    /**
     * Stats overview
     */
    public function stats()
    {
        return response()->json([
            'total' => Subscription::count(),
            'active' => Subscription::where('status', 'active')->count(),
            'pending' => Subscription::where('status', 'pending')->count(),
            'expired' => Subscription::where('status', 'expired')->count(),
            'cancelled' => Subscription::where('status', 'cancelled')->count(),
            'expiring_soon' => Subscription::where('status', 'active')
                ->where('expires_at', '<=', now()->addDays(7))
                ->where('expires_at', '>', now())->count(),
            'revenue_month' => Subscription::where('status', 'active')
                ->whereMonth('paid_at', now()->month)
                ->whereYear('paid_at', now()->year)
                ->sum('amount_paid'),
        ]);
    }
}
