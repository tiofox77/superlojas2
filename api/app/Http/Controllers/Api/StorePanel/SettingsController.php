<?php

namespace App\Http\Controllers\Api\StorePanel;

use App\Http\Controllers\Controller;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SettingsController extends Controller
{
    private function getStore(Request $request, string $slug): Store
    {
        $store = Store::where('slug', $slug)->with('user')->firstOrFail();
        $user = $request->user();
        if ($user->role !== 'super_admin' && !($user->role === 'store_owner' && $user->store_id === $store->id)) {
            abort(403, 'Sem permissao.');
        }
        return $store;
    }

    public function show(Request $request, string $slug)
    {
        return response()->json($this->getStore($request, $slug));
    }

    public function update(Request $request, string $slug)
    {
        $store = $this->getStore($request, $slug);

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'logo' => 'sometimes|file|image|max:2048',
            'banner' => 'sometimes|file|image|max:4096',
            'province' => 'sometimes|string',
            'city' => 'sometimes|string',
            'whatsapp' => 'sometimes|string',
            'email' => 'sometimes|nullable|email',
            'phone' => 'sometimes|nullable|string',
            'socials' => 'sometimes|nullable',
            'whatsapp_message' => 'sometimes|nullable|string',
            'whatsapp_orders_enabled' => 'sometimes|boolean',
            'show_stock' => 'sometimes|boolean',
            'business_hours' => 'sometimes|nullable',
            'meta_title' => 'sometimes|nullable|string|max:70',
            'meta_description' => 'sometimes|nullable|string|max:160',
            'meta_keywords' => 'sometimes|nullable|string|max:255',
            'return_policy' => 'sometimes|nullable|string',
            'shipping_policy' => 'sometimes|nullable|string',
            'terms' => 'sometimes|nullable|string',
            'announcement' => 'sometimes|nullable|string|max:255',
            'announcement_active' => 'sometimes|boolean',
            'delivery_zones' => 'sometimes|nullable',
            'min_order_value' => 'sometimes|nullable|numeric|min:0',
        ]);

        $data = $request->except(['logo', 'banner']);

        // Decode JSON strings sent via FormData
        if (is_string($data['business_hours'] ?? null)) {
            $data['business_hours'] = json_decode($data['business_hours'], true);
        }
        if (is_string($data['delivery_zones'] ?? null)) {
            $data['delivery_zones'] = json_decode($data['delivery_zones'], true);
        }
        if (is_string($data['socials'] ?? null)) {
            $data['socials'] = json_decode($data['socials'], true);
        }

        if ($request->hasFile('logo')) {
            if ($store->logo && str_starts_with($store->logo, '/storage/')) {
                Storage::disk('public')->delete(str_replace('/storage/', '', $store->logo));
            }
            $data['logo'] = '/storage/' . $request->file('logo')->store("stores/{$store->id}/logos", 'public');
        }

        if ($request->hasFile('banner')) {
            if ($store->banner && str_starts_with($store->banner, '/storage/')) {
                Storage::disk('public')->delete(str_replace('/storage/', '', $store->banner));
            }
            $data['banner'] = '/storage/' . $request->file('banner')->store("stores/{$store->id}/banners", 'public');
        }

        $store->update($data);

        return response()->json($store->fresh()->load('user'));
    }
}
