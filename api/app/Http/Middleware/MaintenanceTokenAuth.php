<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Authenticates the maintenance API with a token created by a super admin
 * (POST /api/admin/maintenance-tokens). Usage: ->middleware('maintenance:read') or 'maintenance:write'.
 * Every call is written to maintenance_logs.
 */
class MaintenanceTokenAuth
{
    public function handle(Request $request, Closure $next, string $ability = 'read'): Response
    {
        $plain = $request->bearerToken() ?: $request->header('X-Maintenance-Token');
        if (!$plain || !str_starts_with($plain, 'mt_')) {
            return response()->json(['error' => 'Token de manutencao em falta.'], 401);
        }

        $token = DB::table('maintenance_tokens')->where('token_hash', hash('sha256', $plain))->first();
        if (!$token || $token->revoked_at || ($token->expires_at && now()->greaterThan($token->expires_at))) {
            $this->audit(null, $request, 401, 'invalid, revoked or expired token');
            return response()->json(['error' => 'Token de manutencao invalido, revogado ou expirado.'], 401);
        }

        $abilities = json_decode($token->abilities, true) ?: [];
        if (!in_array($ability, $abilities, true)) {
            $this->audit($token->id, $request, 403, "missing ability {$ability}");
            return response()->json(['error' => "Este token nao tem a permissao '{$ability}'."], 403);
        }

        DB::table('maintenance_tokens')->where('id', $token->id)
            ->update(['last_used_at' => now(), 'last_used_ip' => $request->ip()]);
        $request->attributes->set('maintenance_token', $token);

        $response = $next($request);
        $this->audit($token->id, $request, $response->getStatusCode(), $request->attributes->get('maintenance_summary'));

        return $response;
    }

    private function audit(?int $tokenId, Request $request, int $status, ?string $summary): void
    {
        try {
            DB::table('maintenance_logs')->insert([
                'token_id' => $tokenId,
                'action' => substr($request->method() . ' ' . $request->path(), 0, 60),
                'ip' => $request->ip(),
                'status' => $status,
                'summary' => $summary ? mb_substr($summary, 0, 500) : null,
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('maintenance audit failed', ['error' => $e->getMessage()]);
        }
    }
}
