<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\User;
use App\Services\MailService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Credenciais incorrectas.'],
            ]);
        }

        if (!$user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Conta desactivada. Contacte o administrador.'],
            ]);
        }

        $token = $user->createToken('auth-token', [$user->role])->plainTextToken;

        return response()->json([
            'user' => $user->load('store'),
            'token' => $token,
        ]);
    }

    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'password' => 'required|string|min:6|confirmed',
            'phone' => 'nullable|string|max:20',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => $request->password,
            'phone' => $request->phone,
            'role' => 'customer',
        ]);

        $token = $user->createToken('auth-token', [$user->role])->plainTextToken;

        // Send welcome email (non-blocking)
        try { (new MailService())->sendWelcome($user->email, $user->name); } catch (\Throwable $e) {}

        // Notify admin
        try {
            Notification::notifyAdmin('new_user', 'Novo utilizador registado', "{$user->name} ({$user->email}) criou uma conta.", 'user-plus', 'violet', '/admin/utilizadores');
        } catch (\Throwable $e) {}

        return response()->json([
            'user' => $user,
            'token' => $token,
        ], 201);
    }

    public function me(Request $request)
    {
        return response()->json($request->user()->load('store'));
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Sessão encerrada com sucesso.']);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'sometimes|nullable|string|max:20',
            'avatar' => 'sometimes|nullable|string',
        ]);

        $user->update($request->only(['name', 'phone', 'avatar']));

        return response()->json($user->fresh()->load('store'));
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required',
            'password' => 'required|string|min:6|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Palavra-passe actual incorrecta.'],
            ]);
        }

        $user->update(['password' => $request->password]);

        return response()->json(['message' => 'Palavra-passe alterada com sucesso.']);
    }

    /**
     * Send password reset link via email.
     */
    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $user = User::where('email', $request->email)->first();
        if (!$user) {
            // Don't reveal if email exists
            return response()->json(['message' => 'Se o email existir, recebera um link de recuperacao.']);
        }

        $token = Str::random(64);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            ['token' => Hash::make($token), 'created_at' => now()]
        );

        $resetUrl = rtrim(config('app.url'), '/') . '/entrar?reset=' . $token . '&email=' . urlencode($user->email);

        try {
            (new MailService())->sendPasswordReset($user->email, $user->name, $resetUrl);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Erro ao enviar email. Tente mais tarde.'], 500);
        }

        return response()->json(['message' => 'Se o email existir, recebera um link de recuperacao.']);
    }

    /**
     * Reset password using token.
     */
    public function resetPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'token' => 'required|string',
            'password' => 'required|string|min:6|confirmed',
        ]);

        $record = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->first();

        if (!$record || !Hash::check($request->token, $record->token)) {
            return response()->json(['message' => 'Token invalido ou expirado.'], 422);
        }

        // Check if token expired (60 min)
        if (now()->diffInMinutes($record->created_at) > 60) {
            DB::table('password_reset_tokens')->where('email', $request->email)->delete();
            return response()->json(['message' => 'Token expirado. Solicite um novo link.'], 422);
        }

        $user = User::where('email', $request->email)->firstOrFail();
        $user->update(['password' => $request->password]);

        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        return response()->json(['message' => 'Palavra-passe redefinida com sucesso. Ja pode fazer login.']);
    }
}
