<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SuperAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user() || !$request->user()->isSuperAdmin()) {
            return response()->json([
                'message' => 'Acesso negado. Apenas super administradores podem aceder este recurso.',
            ], 403);
        }

        if (!$request->user()->is_active) {
            return response()->json([
                'message' => 'Conta desactivada. Contacte o administrador.',
            ], 403);
        }

        return $next($request);
    }
}
