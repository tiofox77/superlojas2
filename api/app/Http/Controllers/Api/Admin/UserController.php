<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::with('store');

        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $perPage = $request->get('per_page', 15);

        return response()->json($query->latest()->paginate($perPage));
    }

    public function show(User $user)
    {
        return response()->json($user->load('store'));
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'password' => 'required|string|min:6',
            'role' => 'required|in:super_admin,store_owner,customer',
            'phone' => 'nullable|string|max:20',
            'store_id' => 'nullable|exists:stores,id',
            'is_active' => 'boolean',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => $request->password,
            'role' => $request->role,
            'phone' => $request->phone,
            'store_id' => $request->store_id,
            'is_active' => $request->get('is_active', true),
        ]);

        return response()->json($user->load('store'), 201);
    }

    public function update(Request $request, User $user)
    {
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'password' => 'sometimes|string|min:6',
            'role' => 'sometimes|in:super_admin,store_owner,customer',
            'phone' => 'sometimes|nullable|string|max:20',
            'avatar' => 'sometimes|nullable|string',
            'store_id' => 'sometimes|nullable|exists:stores,id',
            'is_active' => 'sometimes|boolean',
        ]);

        $data = $request->only(['name', 'email', 'role', 'phone', 'avatar', 'store_id', 'is_active']);

        if ($request->has('password')) {
            $data['password'] = $request->password;
        }

        $user->update($data);

        return response()->json($user->fresh()->load('store'));
    }

    public function destroy(User $user)
    {
        if ($user->isSuperAdmin() && User::where('role', 'super_admin')->count() <= 1) {
            return response()->json([
                'message' => 'Não é possível eliminar o último super administrador.',
            ], 422);
        }

        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'Utilizador eliminado com sucesso.']);
    }

    public function toggleActive(User $user)
    {
        if ($user->isSuperAdmin() && User::where('role', 'super_admin')->where('is_active', true)->count() <= 1 && $user->is_active) {
            return response()->json([
                'message' => 'Não é possível desactivar o último super administrador activo.',
            ], 422);
        }

        $user->update(['is_active' => !$user->is_active]);

        if (!$user->is_active) {
            $user->tokens()->delete();
        }

        return response()->json($user->fresh()->load('store'));
    }
}
