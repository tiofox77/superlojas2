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
    /**
     * Fields to hide from public API responses.
     */
    private static $publicHidden = [
        'user_id', 'api_enabled', 'api_permissions', 'api_rate_limit', 'api_last_used_at',
        'plan_id', 'plan_expires_at', 'categories_changed_at',
    ];

    private function formatStoreForPublic($store): array
    {
        $arr = $store->toArray();
        $arr['has_subdomain'] = $store->plan && $store->plan->custom_domain;
        $arr['product_count'] = $store->products_count ?? 0;
        $arr['follower_count'] = $store->followers_count ?? 0;
        foreach (self::$publicHidden as $field) {
            unset($arr[$field]);
        }
        unset($arr['plan'], $arr['products_count'], $arr['followers_count']);
        return $arr;
    }

    public function index(Request $request)
    {
        $query = Store::with('plan')
            ->withCount(['products', 'followers'])
            ->where('status', 'approved');

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

        if ($request->has('category')) {
            $category = $request->category;
            $query->whereHas('storeCategories', function ($q) use ($category) {
                $q->where('slug', $category)->orWhere('name', $category);
            });
        }

        $sortBy = $request->get('sort', 'newest');
        switch ($sortBy) {
            case 'rating': $query->orderByDesc('rating'); break;
            case 'name': $query->orderBy('name'); break;
            case 'products': $query->orderByDesc('products_count'); break;
            default: $query->latest(); break;
        }

        $stores = $query->get()->map(fn ($store) => $this->formatStoreForPublic($store));

        return response()->json($stores);
    }

    public function show(string $slug)
    {
        $store = Store::where('slug', $slug)
            ->with(['plan', 'products' => function ($q) {
                $q->where('is_active', true)->with(['subcategory', 'categoryRelation']);
            }, 'heroSlides' => function ($q) {
                $q->orderBy('sort_order');
            }])
            ->withCount(['products' => function ($q) { $q->where('is_active', true); }, 'followers'])
            ->firstOrFail();

        $data = $this->formatStoreForPublic($store);
        // Re-attach products and hero_slides (they were already in $arr but not removed)
        return response()->json($data);
    }

    public function featured()
    {
        $stores = Store::with('plan')
            ->withCount(['products', 'followers'])
            ->where('status', 'approved')
            ->where('is_featured', true)
            ->latest()
            ->take(8)
            ->get()
            ->map(fn ($store) => $this->formatStoreForPublic($store));

        return response()->json($stores);
    }

    public function register(Request $request)
    {
        // Validacao base (loja)
        $rules = [
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'logo' => 'required|file|image|max:10240',
            'banner' => 'nullable|file|image|max:10240',
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

        // Verificar limite de lojas pelo plano do utilizador
        if ($user) {
            $userStoreCount = Store::where('user_id', $user->id)->count();
            $maxStores = 1; // default

            // Verificar se o utilizador tem um plano com max_stores
            $mainStore = Store::where('user_id', $user->id)->whereNotNull('plan_id')->first();
            if ($mainStore && $mainStore->plan_id) {
                $userPlan = \App\Models\Plan::find($mainStore->plan_id);
                if ($userPlan) {
                    $maxStores = $userPlan->max_stores ?: 1;
                }
            }

            if ($userStoreCount >= $maxStores) {
                $planName = $userPlan->name ?? 'actual';
                return response()->json([
                    'error' => "O seu plano {$planName} permite no maximo {$maxStores} loja(s). Faca upgrade para o plano Empresarial para ter ate 3 lojas.",
                ], 422);
            }
        }

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

        // Actualizar utilizador como store_owner (keep store_id as default/first store)
        if ($user->role !== 'super_admin') {
            $updateData = ['role' => 'store_owner'];
            if (!$user->store_id) {
                $updateData['store_id'] = $store->id;
            }
            $user->update($updateData);
        } else {
            $user->save();
        }

        // Herdar plano/subscricao da loja principal do utilizador
        $mainStore = Store::where('user_id', $user->id)
            ->whereNotNull('plan_id')
            ->where('id', '!=', $store->id)
            ->first();

        if ($mainStore && $mainStore->plan_id) {
            $store->update([
                'plan_id' => $mainStore->plan_id,
                'plan_expires_at' => $mainStore->plan_expires_at,
            ]);

            $activeSub = \App\Models\Subscription::where('store_id', $mainStore->id)
                ->where('status', 'active')
                ->latest()
                ->first();

            if ($activeSub) {
                \App\Models\Subscription::create([
                    'store_id' => $store->id,
                    'plan_id' => $activeSub->plan_id,
                    'status' => 'active',
                    'starts_at' => $activeSub->starts_at,
                    'expires_at' => $activeSub->expires_at,
                    'auto_renew' => $activeSub->auto_renew,
                    'payment_method' => $activeSub->payment_method,
                    'amount_paid' => 0,
                    'currency' => 'AOA',
                    'paid_at' => now(),
                    'notes' => 'Herdado da loja: ' . $mainStore->name,
                ]);
            }
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

        // Email alert to admin about new store (non-blocking)
        try {
            (new MailService())->sendAdminNewStore(
                $store->name, $user->name, $user->email,
                $store->province ?? '', $request->category ?? '',
                $store->whatsapp ?? '', $autoApprove
            );
        } catch (\Throwable $e) {}

        $response = [
            'message' => $message,
            'store' => $store,
            'auto_approved' => $autoApprove,
            'user' => $user->fresh()->load(['store', 'stores:id,user_id,name,slug,logo,status']),
        ];

        // Se criou conta nova, devolver token + user para auto-login
        if ($token) {
            $response['token'] = $token;
            $response['user'] = $user->load(['store', 'stores:id,user_id,name,slug,logo,status']);
        }

        return response()->json($response, 201);
    }
}
