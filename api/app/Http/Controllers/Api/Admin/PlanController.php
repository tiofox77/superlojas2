<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PlanController extends Controller
{
    public function index()
    {
        $plans = Plan::withCount('stores')->orderBy('sort_order')->get();
        return response()->json($plans);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'billing_cycle' => 'sometimes|in:monthly,yearly,one_time',
            'description' => 'nullable|string',
            'features' => 'nullable|array',
            'max_products' => 'sometimes|integer|min:0',
            'max_images_per_product' => 'sometimes|integer|min:1',
            'max_hero_slides' => 'sometimes|integer|min:0',
            'priority_support' => 'sometimes|boolean',
            'featured_badge' => 'sometimes|boolean',
            'analytics' => 'sometimes|boolean',
            'custom_domain' => 'sometimes|boolean',
            'has_api' => 'sometimes|boolean',
            'has_pos' => 'sometimes|boolean',
            'is_free' => 'sometimes|boolean',
            'is_active' => 'sometimes|boolean',
            'is_recommended' => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer|min:0',
        ]);

        $data['slug'] = Str::slug($data['name']);

        // Ensure slug uniqueness
        $base = $data['slug'];
        $i = 1;
        while (Plan::where('slug', $data['slug'])->exists()) {
            $data['slug'] = $base . '-' . $i++;
        }

        // If marking as free, price must be 0
        if (!empty($data['is_free'])) {
            $data['price'] = 0;
        }

        $plan = Plan::create($data);

        return response()->json($plan, 201);
    }

    public function show(Plan $plan)
    {
        $plan->loadCount('stores');
        return response()->json($plan);
    }

    public function update(Request $request, Plan $plan)
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'price' => 'sometimes|numeric|min:0',
            'billing_cycle' => 'sometimes|in:monthly,yearly,one_time',
            'description' => 'nullable|string',
            'features' => 'nullable|array',
            'max_products' => 'sometimes|integer|min:0',
            'max_images_per_product' => 'sometimes|integer|min:1',
            'max_hero_slides' => 'sometimes|integer|min:0',
            'priority_support' => 'sometimes|boolean',
            'featured_badge' => 'sometimes|boolean',
            'analytics' => 'sometimes|boolean',
            'custom_domain' => 'sometimes|boolean',
            'has_api' => 'sometimes|boolean',
            'has_pos' => 'sometimes|boolean',
            'is_free' => 'sometimes|boolean',
            'is_active' => 'sometimes|boolean',
            'is_recommended' => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer|min:0',
        ]);

        if (isset($data['name']) && $data['name'] !== $plan->name) {
            $data['slug'] = Str::slug($data['name']);
            $base = $data['slug'];
            $i = 1;
            while (Plan::where('slug', $data['slug'])->where('id', '!=', $plan->id)->exists()) {
                $data['slug'] = $base . '-' . $i++;
            }
        }

        if (!empty($data['is_free'])) {
            $data['price'] = 0;
        }

        $plan->update($data);
        $plan->loadCount('stores');

        return response()->json($plan);
    }

    public function destroy(Plan $plan)
    {
        // Don't delete if stores are using it
        if ($plan->stores()->count() > 0) {
            return response()->json([
                'message' => 'Nao e possivel eliminar este plano. Existem ' . $plan->stores()->count() . ' lojas vinculadas.'
            ], 422);
        }

        $plan->delete();
        return response()->json(['message' => 'Plano eliminado com sucesso.']);
    }

    /**
     * Assign a plan to a store
     */
    public function assignToStore(Request $request)
    {
        $data = $request->validate([
            'store_id' => 'required|exists:stores,id',
            'plan_id' => 'required|exists:plans,id',
        ]);

        $store = \App\Models\Store::findOrFail($data['store_id']);
        $plan = Plan::findOrFail($data['plan_id']);

        $store->plan_id = $plan->id;

        if (!$plan->is_free && $plan->billing_cycle === 'monthly') {
            $store->plan_expires_at = now()->addMonth();
        } elseif (!$plan->is_free && $plan->billing_cycle === 'yearly') {
            $store->plan_expires_at = now()->addYear();
        } else {
            $store->plan_expires_at = null;
        }

        $store->save();

        return response()->json([
            'message' => "Plano '{$plan->name}' atribuido a loja '{$store->name}'.",
            'store' => $store->load('plan'),
        ]);
    }
}
