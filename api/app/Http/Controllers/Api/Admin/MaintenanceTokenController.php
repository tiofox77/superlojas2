<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Super admin management of maintenance API tokens. The plain token is returned once, on creation;
 * only its sha256 hash is stored.
 */
class MaintenanceTokenController extends Controller
{
    public function index()
    {
        return response()->json(
            DB::table('maintenance_tokens')->orderByDesc('id')
                ->get(['id', 'name', 'token_hint', 'abilities', 'expires_at', 'revoked_at', 'last_used_at', 'last_used_ip', 'created_at'])
                ->map(fn ($t) => [...(array) $t, 'abilities' => json_decode($t->abilities, true)])
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'abilities' => 'nullable|array',
            'abilities.*' => 'in:read,write',
            'expires_days' => 'nullable|integer|min:1|max:365',
        ]);

        $plain = 'mt_' . Str::random(48);
        $abilities = array_values(array_unique($data['abilities'] ?? ['read', 'write']));
        $id = DB::table('maintenance_tokens')->insertGetId([
            'name' => $data['name'],
            'token_hash' => hash('sha256', $plain),
            'token_hint' => substr($plain, -6),
            'abilities' => json_encode($abilities),
            'created_by' => $request->user()?->id,
            'expires_at' => isset($data['expires_days']) ? now()->addDays($data['expires_days']) : null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'id' => $id,
            'name' => $data['name'],
            'abilities' => $abilities,
            'token' => $plain,
            'warning' => 'Guarde este token agora: nao volta a ser mostrado. Revogue-o em DELETE /api/admin/maintenance-tokens/' . $id . '.',
        ], 201);
    }

    public function destroy(int $id)
    {
        $updated = DB::table('maintenance_tokens')->where('id', $id)->whereNull('revoked_at')
            ->update(['revoked_at' => now(), 'updated_at' => now()]);
        return response()->json(['revoked' => (bool) $updated]);
    }
}
