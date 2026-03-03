<?php

namespace App\Http\Controllers\Api\StorePanel;

use App\Http\Controllers\Controller;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ApiSettingsController extends Controller
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
     * Show current API settings (reveals key/secret to owner)
     */
    public function show(Request $request, string $slug)
    {
        $store = $this->getStore($request, $slug);
        $plan = $store->plan;

        return response()->json([
            'api_enabled' => $store->api_enabled,
            'api_key' => $store->api_key,
            'api_secret' => $store->api_secret,
            'api_permissions' => $store->api_permissions ?? ['read', 'write', 'delete'],
            'api_rate_limit' => $store->api_rate_limit ?? 60,
            'api_last_used_at' => $store->api_last_used_at,
            'plan_allows_api' => $plan && $plan->has_api,
            'plan_name' => $plan ? $plan->name : null,
            'base_url' => url("/api/store-api/{$store->slug}"),
        ]);
    }

    /**
     * Generate new API key + secret
     */
    public function generate(Request $request, string $slug)
    {
        $store = $this->getStore($request, $slug);

        // Check plan
        $plan = $store->plan;
        if (!$plan || !$plan->has_api) {
            return response()->json([
                'error' => 'O seu plano (' . ($plan ? $plan->name : 'nenhum') . ') nao inclui acesso a API.',
                'upgrade' => true,
            ], 403);
        }

        $store->update([
            'api_key' => 'sk_' . Str::random(48),
            'api_secret' => 'ss_' . Str::random(48),
            'api_enabled' => true,
        ]);

        return response()->json([
            'message' => 'Novas credenciais geradas com sucesso.',
            'api_key' => $store->api_key,
            'api_secret' => $store->api_secret,
            'warning' => 'Guarde estas credenciais num local seguro. O secret nao sera mostrado novamente.',
        ]);
    }

    /**
     * Update API settings (permissions, rate limit, enable/disable)
     */
    public function update(Request $request, string $slug)
    {
        $store = $this->getStore($request, $slug);

        $data = $request->validate([
            'api_enabled' => 'sometimes|boolean',
            'api_permissions' => 'sometimes|array',
            'api_permissions.*' => 'in:read,write,delete',
            'api_rate_limit' => 'sometimes|integer|min:10|max:1000',
        ]);

        $store->update($data);

        return response()->json([
            'message' => 'Configuracoes de API actualizadas.',
            'api_enabled' => $store->api_enabled,
            'api_permissions' => $store->api_permissions,
            'api_rate_limit' => $store->api_rate_limit,
        ]);
    }

    /**
     * Revoke API keys
     */
    public function revoke(Request $request, string $slug)
    {
        $store = $this->getStore($request, $slug);

        $store->update([
            'api_key' => null,
            'api_secret' => null,
            'api_enabled' => false,
        ]);

        return response()->json(['message' => 'Credenciais de API revogadas.']);
    }
}
