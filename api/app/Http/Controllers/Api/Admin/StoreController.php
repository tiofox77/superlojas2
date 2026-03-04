<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\User;
use App\Services\MailService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class StoreController extends Controller
{
    public function index(Request $request)
    {
        $query = Store::with('user')->withCount('products');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('province')) {
            $query->where('province', $request->province);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $perPage = $request->get('per_page', 15);

        return response()->json($query->latest()->paginate($perPage));
    }

    public function show(Store $store)
    {
        return response()->json(
            $store->load(['products', 'heroSlides', 'user'])->loadCount('products')
        );
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|unique:stores',
            'description' => 'required|string',
            'logo' => 'required|file|image|max:2048',
            'banner' => 'nullable|file|image|max:4096',
            'province' => 'required|string',
            'city' => 'required|string',
            'whatsapp' => 'required|string',
            'user_id' => 'nullable|exists:users,id',
            'status' => 'sometimes|in:pending,approved,rejected',
            'categories' => 'sometimes|array',
            'socials' => 'sometimes|nullable|array',
        ]);

        $data = $request->except(['logo', 'banner']);

        // Vincular ao utilizador autenticado se user_id nao especificado
        if (empty($data['user_id'])) {
            $data['user_id'] = $request->user()->id;
        }

        // Criar loja primeiro para obter o ID
        $data['logo'] = '';
        $data['banner'] = '';
        $store = Store::create($data);

        // Upload logo para pasta individual da loja
        if ($request->hasFile('logo')) {
            $store->logo = '/storage/' . $request->file('logo')->store("stores/{$store->id}/logos", 'public');
        }

        // Upload banner
        if ($request->hasFile('banner')) {
            $store->banner = '/storage/' . $request->file('banner')->store("stores/{$store->id}/banners", 'public');
        } else {
            $store->banner = $store->logo;
        }
        $store->save();

        $user = User::find($data['user_id']);
        if ($user && $user->role !== 'super_admin') {
            $user->update(['role' => 'store_owner', 'store_id' => $store->id]);
        }

        return response()->json($store->load('user'), 201);
    }

    public function update(Request $request, Store $store)
    {
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'slug' => 'sometimes|string|unique:stores,slug,' . $store->id,
            'description' => 'sometimes|string',
            'logo' => 'sometimes|file|image|max:2048',
            'banner' => 'sometimes|file|image|max:4096',
            'province' => 'sometimes|string',
            'city' => 'sometimes|string',
            'whatsapp' => 'sometimes|string',
            'user_id' => 'sometimes|nullable|exists:users,id',
            'rating' => 'sometimes|numeric|min:0|max:5',
            'review_count' => 'sometimes|integer|min:0',
            'status' => 'sometimes|in:pending,approved,rejected',
            'categories' => 'sometimes|array',
            'socials' => 'sometimes|nullable|array',
        ]);

        $data = $request->except(['logo', 'banner']);

        // Upload novo logo
        if ($request->hasFile('logo')) {
            // Apagar logo antigo
            if ($store->logo && str_starts_with($store->logo, '/storage/')) {
                Storage::disk('public')->delete(str_replace('/storage/', '', $store->logo));
            }
            $data['logo'] = '/storage/' . $request->file('logo')->store("stores/{$store->id}/logos", 'public');
        }

        // Upload novo banner
        if ($request->hasFile('banner')) {
            if ($store->banner && str_starts_with($store->banner, '/storage/')) {
                Storage::disk('public')->delete(str_replace('/storage/', '', $store->banner));
            }
            $data['banner'] = '/storage/' . $request->file('banner')->store("stores/{$store->id}/banners", 'public');
        }

        $store->update($data);

        return response()->json($store->fresh()->load('user'));
    }

    public function destroy(Store $store)
    {
        // Apagar ficheiros de logo e banner
        if ($store->logo && str_starts_with($store->logo, '/storage/')) {
            Storage::disk('public')->delete(str_replace('/storage/', '', $store->logo));
        }
        if ($store->banner && str_starts_with($store->banner, '/storage/')) {
            Storage::disk('public')->delete(str_replace('/storage/', '', $store->banner));
        }

        // Desassociar utilizador
        if ($store->user_id) {
            User::where('id', $store->user_id)->update(['store_id' => null]);
        }

        $store->products()->delete();
        $store->heroSlides()->delete();
        $store->delete();

        return response()->json(['message' => 'Loja eliminada com sucesso.']);
    }

    public function approve(Store $store)
    {
        $store->update(['status' => 'approved']);

        // Send approval email
        try {
            $owner = $store->user;
            if ($owner) {
                $storeUrl = config('app.url') . '/loja/' . $store->slug . '/painel';
                (new MailService())->sendStoreApproved($owner->email, $owner->name, $store->name, $storeUrl);
            }
        } catch (\Throwable $e) {}

        // Notify store owner
        try {
            \App\Models\Notification::notifyStore($store->id, 'store_approved', 'Loja aprovada!', "A sua loja \"{$store->name}\" foi aprovada. Ja pode comecar a vender!", 'check-circle', 'emerald', '/loja/' . $store->slug . '/painel');
        } catch (\Throwable $e) {}

        return response()->json([
            'message' => "Loja \"{$store->name}\" aprovada com sucesso.",
            'store' => $store->fresh(),
        ]);
    }

    public function reject(Request $request, Store $store)
    {
        $reason = $request->input('reason', '');
        $store->update(['status' => 'rejected']);

        // Send rejection email
        try {
            $owner = $store->user;
            if ($owner) {
                (new MailService())->sendStoreRejected($owner->email, $owner->name, $store->name, $reason);
            }
        } catch (\Throwable $e) {}

        // Notify store owner
        try {
            $body = "A sua loja \"{$store->name}\" nao foi aprovada.";
            if ($reason) $body .= " Motivo: {$reason}";
            \App\Models\Notification::notifyStore($store->id, 'store_rejected', 'Loja nao aprovada', $body, 'x-circle', 'red');
        } catch (\Throwable $e) {}

        return response()->json([
            'message' => "Loja \"{$store->name}\" rejeitada.",
            'store' => $store->fresh(),
        ]);
    }

    public function toggleOfficial(Store $store)
    {
        $store->update(['is_official' => !$store->is_official]);

        return response()->json([
            'message' => $store->is_official
                ? "Loja \"{$store->name}\" marcada como oficial."
                : "Loja \"{$store->name}\" removida de oficial.",
            'is_official' => $store->is_official,
            'store' => $store->fresh(),
        ]);
    }

    public function toggleFeatured(Store $store)
    {
        $store->update(['is_featured' => !$store->is_featured]);

        return response()->json([
            'message' => $store->is_featured
                ? "Loja \"{$store->name}\" colocada em destaque."
                : "Loja \"{$store->name}\" removida de destaque.",
            'is_featured' => $store->is_featured,
            'store' => $store->fresh(),
        ]);
    }

    public function ban(Request $request, Store $store)
    {
        $request->validate([
            'reason' => 'required|string|max:2000',
        ]);

        $reason = $request->input('reason');
        $store->update(['status' => 'banned']);

        // Send ban email to store owner
        try {
            $owner = $store->user;
            if ($owner) {
                (new MailService())->sendStoreBanned($owner->email, $owner->name, $store->name, $reason);
            }
        } catch (\Throwable $e) {}

        // Notify store owner
        try {
            \App\Models\Notification::notifyStore($store->id, 'store_banned', 'Loja banida', "A sua loja \"{$store->name}\" foi banida. Motivo: {$reason}", 'shield-x', 'red');
        } catch (\Throwable $e) {}

        // Notify admin log
        try {
            \App\Models\Notification::notifyAdmin('store_banned', "Loja \"{$store->name}\" banida", "Motivo: {$reason}", 'shield-x', 'red', '/admin/lojas');
        } catch (\Throwable $e) {}

        return response()->json([
            'message' => "Loja \"{$store->name}\" banida com sucesso.",
            'store' => $store->fresh(),
        ]);
    }
}
