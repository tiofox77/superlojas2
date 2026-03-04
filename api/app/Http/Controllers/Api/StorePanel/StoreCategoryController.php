<?php

namespace App\Http\Controllers\Api\StorePanel;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Setting;
use App\Models\Store;
use Illuminate\Http\Request;

class StoreCategoryController extends Controller
{
    private function getStore(Request $request, string $slug): Store
    {
        $store = Store::where('slug', $slug)->with(['plan', 'storeCategories'])->firstOrFail();
        $user = $request->user();
        if ($user->role !== 'super_admin' && !($user->role === 'store_owner' && $user->store_id === $store->id)) {
            abort(403, 'Sem permissao.');
        }
        return $store;
    }

    /**
     * GET /store-panel/{slug}/categories
     * Returns all available categories + store's current selections + plan limits + cooldown info
     */
    public function index(Request $request, string $slug)
    {
        $store = $this->getStore($request, $slug);

        // Auto-migrate legacy JSON categories to pivot if pivot is empty
        if ($store->storeCategories->isEmpty()) {
            $legacyNames = $store->categories ?? [];
            if (!empty($legacyNames)) {
                $slugs = array_map(fn($n) => \Illuminate\Support\Str::slug($n), $legacyNames);
                $resolved = Category::whereIn('name', $legacyNames)
                    ->orWhereIn('slug', $slugs)
                    ->pluck('id')
                    ->toArray();
                if (!empty($resolved)) {
                    $store->storeCategories()->sync($resolved);
                    $store->load('storeCategories');
                }
            }
        }

        $plan = $store->plan;

        $maxCategories = $plan ? $plan->max_categories : 1;
        $cooldownDays = (int) (Setting::where('key', 'category_change_cooldown_days')->value('value') ?? 30);

        $canChange = true;
        $cooldownUntil = null;
        $daysRemaining = 0;

        if ($store->categories_changed_at && $cooldownDays > 0) {
            $cooldownUntil = $store->categories_changed_at->addDays($cooldownDays);
            if (now()->lt($cooldownUntil)) {
                $canChange = false;
                $daysRemaining = (int) now()->diffInDays($cooldownUntil, false);
            }
        }

        // Super admin bypasses cooldown
        if ($request->user()->role === 'super_admin') {
            $canChange = true;
        }

        return response()->json([
            'categories' => Category::orderBy('name')->get(['id', 'name', 'slug', 'icon']),
            'selected' => $store->storeCategories->pluck('id'),
            'max_categories' => $maxCategories,
            'can_change' => $canChange,
            'cooldown_days' => $cooldownDays,
            'cooldown_until' => $cooldownUntil?->toIso8601String(),
            'days_remaining' => $daysRemaining,
            'categories_changed_at' => $store->categories_changed_at?->toIso8601String(),
            'plan_name' => $plan->name ?? 'Sem plano',
            'needs_request' => !$canChange,
        ]);
    }

    /**
     * PUT /store-panel/{slug}/categories
     * Update the store's selected categories (with plan + cooldown validation)
     */
    public function update(Request $request, string $slug)
    {
        $store = $this->getStore($request, $slug);
        $plan = $store->plan;
        $user = $request->user();

        $maxCategories = $plan ? $plan->max_categories : 1;
        $cooldownDays = (int) (Setting::where('key', 'category_change_cooldown_days')->value('value') ?? 30);

        // Check cooldown (unless super_admin)
        if ($user->role !== 'super_admin' && $store->categories_changed_at && $cooldownDays > 0) {
            $cooldownUntil = $store->categories_changed_at->addDays($cooldownDays);
            if (now()->lt($cooldownUntil)) {
                $daysRemaining = (int) now()->diffInDays($cooldownUntil, false);
                return response()->json([
                    'message' => "Deve aguardar mais {$daysRemaining} dia(s) para trocar de categoria. Ou solicite ao administrador.",
                    'cooldown_until' => $cooldownUntil->toIso8601String(),
                    'days_remaining' => $daysRemaining,
                ], 422);
            }
        }

        $request->validate([
            'category_ids' => 'required|array|min:1',
            'category_ids.*' => 'integer|exists:categories,id',
        ]);

        $categoryIds = $request->input('category_ids');

        // Enforce plan limit (0 = unlimited)
        if ($maxCategories > 0 && count($categoryIds) > $maxCategories) {
            return response()->json([
                'message' => "O seu plano ({$plan->name}) permite no maximo {$maxCategories} categoria(s). Faca upgrade para ter mais.",
                'max_categories' => $maxCategories,
            ], 422);
        }

        // Sync pivot table
        $store->storeCategories()->sync($categoryIds);

        // Update the legacy JSON categories column for backwards compatibility
        $categoryNames = Category::whereIn('id', $categoryIds)->pluck('name')->toArray();
        $store->update([
            'categories' => $categoryNames,
            'categories_changed_at' => now(),
        ]);

        return response()->json([
            'message' => 'Categorias atualizadas com sucesso.',
            'selected' => $categoryIds,
            'categories_changed_at' => $store->fresh()->categories_changed_at->toIso8601String(),
        ]);
    }

    /**
     * POST /store-panel/{slug}/categories/request-change
     * Store owner requests a category change when on cooldown
     */
    public function requestChange(Request $request, string $slug)
    {
        $store = $this->getStore($request, $slug);

        $request->validate([
            'category_ids' => 'required|array|min:1',
            'category_ids.*' => 'integer|exists:categories,id',
            'reason' => 'nullable|string|max:500',
        ]);

        $categoryNames = Category::whereIn('id', $request->input('category_ids'))->pluck('name')->implode(', ');

        \App\Models\Notification::notifyAdmin(
            'category_change_request',
            'Pedido de Troca de Categoria',
            "A loja \"{$store->name}\" solicita troca de categorias para: {$categoryNames}." .
                ($request->input('reason') ? " Motivo: {$request->input('reason')}" : ''),
            'tag',
            'amber',
            "/admin/lojas",
            [
                'store_id' => $store->id,
                'store_slug' => $store->slug,
                'store_name' => $store->name,
                'requested_category_ids' => $request->input('category_ids'),
                'reason' => $request->input('reason'),
            ]
        );

        return response()->json([
            'message' => 'Pedido de troca de categoria enviado ao administrador. Sera notificado quando for processado.',
        ]);
    }
}
