<?php

namespace App\Http\Middleware;

use App\Models\Store;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class StoreApiAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        $slug = $request->route('slug');

        // Get API key from header or query
        $apiKey = $request->header('X-Api-Key') ?: $request->query('api_key');
        $apiSecret = $request->header('X-Api-Secret') ?: $request->query('api_secret');

        if (!$apiKey || !$apiSecret) {
            return response()->json([
                'error' => 'API key e secret sao obrigatorios.',
                'hint' => 'Envie X-Api-Key e X-Api-Secret nos headers ou como query params.',
            ], 401);
        }

        $store = Store::where('slug', $slug)
            ->where('api_key', $apiKey)
            ->where('api_secret', $apiSecret)
            ->first();

        if (!$store) {
            return response()->json(['error' => 'Credenciais de API invalidas.'], 401);
        }

        if (!$store->api_enabled) {
            return response()->json(['error' => 'API desactivada para esta loja.'], 403);
        }

        if ($store->status !== 'approved') {
            return response()->json(['error' => 'Loja nao esta aprovada.'], 403);
        }

        // Check plan allows API
        $plan = $store->plan;
        if (!$plan || !$plan->is_active) {
            return response()->json(['error' => 'Plano inactivo. Contacte o suporte.'], 403);
        }

        if (!$plan->has_api) {
            return response()->json([
                'error' => 'O seu plano (' . $plan->name . ') nao inclui acesso a API.',
                'upgrade' => 'Faca upgrade para um plano com acesso a API.',
            ], 403);
        }

        // Update last used
        $store->timestamps = false;
        $store->update(['api_last_used_at' => now()]);
        $store->timestamps = true;

        // Attach store to request
        $request->attributes->set('api_store', $store);

        return $next($request);
    }
}
