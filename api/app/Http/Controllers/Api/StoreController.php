<?php

namespace App\Http\Controllers\Api;

use App\Helpers\SeoFileName;
use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\Setting;
use App\Models\User;
use App\Services\MailService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class StoreController extends Controller
{
    public function index(Request $request)
    {
        $query = Store::where('status', 'approved');

        if ($request->has('province') && $request->province !== 'all') {
            $query->where('province', $request->province);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        return response()->json($query->get());
    }

    public function show(string $slug)
    {
        $store = Store::where('slug', $slug)
            ->with(['products', 'heroSlides' => function ($q) {
                $q->orderBy('sort_order');
            }])
            ->firstOrFail();

        return response()->json($store);
    }

    public function featured()
    {
        return response()->json(
            Store::where('status', 'approved')
                ->where('is_featured', true)
                ->latest()
                ->take(8)
                ->get()
        );
    }

    public function register(Request $request)
    {
        // Validacao base (loja)
        $rules = [
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'logo' => 'required|file|image|max:6144',
            'banner' => 'nullable|file|image|max:6144',
            'province' => 'required|string',
            'city' => 'required|string',
            'municipality' => 'nullable|string',
            'address' => 'nullable|string|max:500',
            'whatsapp' => 'required|string',
            'category' => 'required|string',
            'user_name' => 'required|string|max:255',
            'user_phone' => 'nullable|string|max:50',
        ];

        // Se nao esta logado, exigir campos de criacao de conta
        $user = $request->user();
        if (!$user) {
            $rules['user_email'] = 'required|email|unique:users,email';
            $rules['user_password'] = 'required|string|min:6';
        }

        $request->validate($rules);

        // Criar conta nova ou usar a existente
        $token = null;
        if (!$user) {
            $user = User::create([
                'name' => $request->user_name,
                'email' => $request->user_email,
                'password' => Hash::make($request->user_password),
                'phone' => $request->user_phone,
                'role' => 'store_owner',
            ]);
            $token = $user->createToken('auth-token', ['store_owner'])->plainTextToken;
        } else {
            if ($request->user_name) $user->name = $request->user_name;
            if ($request->user_phone) $user->phone = $request->user_phone;
        }

        // Verificar se auto-approve esta activo
        $autoApprove = Setting::get('store_auto_approve', 'false') === 'true';

        // Gerar slug unico
        $slug = Str::slug($request->name);
        $count = Store::where('slug', 'like', $slug . '%')->count();
        if ($count > 0) $slug .= '-' . ($count + 1);

        $data = [
            'user_id' => $user->id,
            'name' => $request->name,
            'slug' => $slug,
            'description' => $request->description,
            'province' => $request->province,
            'city' => $request->city,
            'municipality' => $request->municipality,
            'address' => $request->address,
            'whatsapp' => $request->whatsapp,
            'categories' => [$request->category],
            'status' => $autoApprove ? 'approved' : 'pending',
        ];

        // Criar loja primeiro para obter o ID
        $data['logo'] = '';
        $data['banner'] = '';
        $store = Store::create($data);

        // Upload logo para pasta individual da loja
        if ($request->hasFile('logo')) {
            $store->logo = SeoFileName::storePublic($request->file('logo'), "stores/{$store->id}/logos", $store->slug, 'logo');
        }

        // Upload banner
        if ($request->hasFile('banner')) {
            $store->banner = SeoFileName::storePublic($request->file('banner'), "stores/{$store->id}/banners", $store->slug, 'banner');
        } else {
            $store->banner = $store->logo;
        }
        $store->save();

        // Populate category_store pivot from the selected category name
        $categoryName = $request->category;
        $category = \App\Models\Category::where('name', $categoryName)
            ->orWhere('slug', \Illuminate\Support\Str::slug($categoryName))
            ->first();
        if ($category) {
            $store->storeCategories()->sync([$category->id]);
        }

        // Actualizar utilizador como store_owner
        if ($user->role !== 'super_admin') {
            $user->update(['role' => 'store_owner', 'store_id' => $store->id]);
        } else {
            $user->save();
        }

        $message = $autoApprove
            ? 'Loja registada e aprovada automaticamente! Ja pode comecar a vender.'
            : 'Loja registada com sucesso! Sera analisada e aprovada em breve.';

        // Send store registration email (non-blocking)
        try {
            (new MailService())->sendStoreRegistered($user->email, $user->name, $store->name, $autoApprove);
        } catch (\Throwable $e) {}

        // Notify admin about new store
        try {
            $notifType = $autoApprove ? 'store_approved' : 'store_pending';
            $notifTitle = $autoApprove ? 'Nova loja aprovada automaticamente' : 'Nova loja pendente de aprovacao';
            $notifBody = "A loja \"{$store->name}\" foi registada por {$user->name}.";
            \App\Models\Notification::notifyAdmin($notifType, $notifTitle, $notifBody, 'store', 'orange', '/admin/lojas');
        } catch (\Throwable $e) {}

        $response = [
            'message' => $message,
            'store' => $store,
            'auto_approved' => $autoApprove,
        ];

        // Se criou conta nova, devolver token + user para auto-login
        if ($token) {
            $response['token'] = $token;
            $response['user'] = $user->load('store');
        }

        return response()->json($response, 201);
    }
}
