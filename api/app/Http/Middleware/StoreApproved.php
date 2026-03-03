<?php

namespace App\Http\Middleware;

use App\Models\Store;
use Closure;
use Illuminate\Http\Request;

class StoreApproved
{
    public function handle(Request $request, Closure $next)
    {
        $slug = $request->route('slug');
        $store = Store::where('slug', $slug)->first();

        if (!$store) {
            return response()->json(['message' => 'Loja nao encontrada.'], 404);
        }

        // Super admins podem sempre aceder
        if ($request->user() && $request->user()->role === 'super_admin') {
            return $next($request);
        }

        // Apenas bloquear operacoes de escrita (POST, PUT, DELETE)
        // GET e permitido para que o painel carregue e mostre o status
        if (in_array($request->method(), ['POST', 'PUT', 'DELETE']) && $store->status !== 'approved') {
            return response()->json([
                'message' => 'A sua loja ainda nao foi aprovada. Aguarde a aprovacao para poder gerir produtos e conteudo.',
                'store_status' => $store->status,
            ], 403);
        }

        return $next($request);
    }
}
