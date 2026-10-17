<?php

namespace App\Http\Controllers\Api\StorePanel;

use App\Helpers\SeoFileName;
use App\Http\Controllers\Controller;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class SettingsController extends Controller
{
    private function getStore(Request $request, string $slug): Store
    {
        $store = Store::where('slug', $slug)->with('user')->firstOrFail();
        $user = $request->user();
        if ($user->role !== 'super_admin' && !($user->role === 'store_owner' && (int)$store->user_id === (int)$user->id)) {
            abort(403, 'Sem permissao.');
        }
        return $store;
    }

    public function show(Request $request, string $slug)
    {
        $store = $this->getStore($request, $slug);
        $store->ensureCategory();
        $store->load(['plan', 'storeCategories']);

        $data = $store->toArray();

        // Override categories with pivot IDs for the frontend
        $pivotIds = $store->storeCategories->pluck('id')->toArray();
        if (!empty($pivotIds)) {
            $data['categories'] = $pivotIds;
        } else {
            // Backward compat: if pivot is empty but legacy JSON has category names,
            // resolve IDs from the names and auto-populate the pivot
            $legacyNames = $store->categories ?? [];
            if (!empty($legacyNames)) {
                $resolved = \App\Models\Category::whereIn('name', $legacyNames)
                    ->orWhereIn('slug', array_map(fn($n) => \Illuminate\Support\Str::slug($n), $legacyNames))
                    ->pluck('id')
                    ->toArray();
                if (!empty($resolved)) {
                    $store->storeCategories()->sync($resolved);
                    $data['categories'] = $resolved;
                }
            }
        }

        return response()->json($data);
    }

    public function update(Request $request, string $slug)
    {
        $store = $this->getStore($request, $slug);

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'logo' => 'sometimes|file|image|max:10240',
            'banner' => 'sometimes|file|image|max:10240',
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

        $disk = Storage::disk('public');
        $logoFolder = "stores/{$store->id}/logos";
        $bannerFolder = "stores/{$store->id}/banners";

        // ─── DIAGNOSTIC LOG ───
        $rawLogo = $store->getRawOriginal('logo');
        $rawBanner = $store->getRawOriginal('banner');
        Log::info('=== STORE SETTINGS UPDATE ===', [
            'store_id' => $store->id,
            'store_slug' => $store->slug,
            'environment' => [
                'app_env' => config('app.env'),
                'app_url' => config('app.url'),
                'is_production' => app()->isProduction(),
                'hostname' => gethostname(),
            ],
            'database' => [
                'connection' => config('database.default'),
                'host' => config('database.connections.' . config('database.default') . '.host'),
                'database' => config('database.connections.' . config('database.default') . '.database'),
            ],
            'storage' => [
                'disk_path' => $disk->path(''),
                'logo_folder_path' => $disk->path($logoFolder),
                'logo_folder_exists' => $disk->exists($logoFolder),
                'banner_folder_path' => $disk->path($bannerFolder),
                'banner_folder_exists' => $disk->exists($bannerFolder),
                'symlink_path' => public_path('storage'),
                'symlink_exists' => file_exists(public_path('storage')),
            ],
            'current_db_values' => [
                'logo_raw' => $rawLogo,
                'banner_raw' => $rawBanner,
                'logo_file_exists' => $rawLogo && str_starts_with($rawLogo, '/storage/')
                    ? $disk->exists(str_replace('/storage/', '', $rawLogo)) : 'N/A',
                'banner_file_exists' => $rawBanner && str_starts_with($rawBanner, '/storage/')
                    ? $disk->exists(str_replace('/storage/', '', $rawBanner)) : 'N/A',
            ],
            'request' => [
                'has_logo_file' => $request->hasFile('logo'),
                'has_banner_file' => $request->hasFile('banner'),
                'method' => $request->method(),
                'url' => $request->fullUrl(),
            ],
        ]);

        // Ensure store folders exist physically
        if (!$disk->exists($logoFolder)) {
            $disk->makeDirectory($logoFolder);
            Log::info("Created logo folder: {$logoFolder}", ['full_path' => $disk->path($logoFolder)]);
        }
        if (!$disk->exists($bannerFolder)) {
            $disk->makeDirectory($bannerFolder);
            Log::info("Created banner folder: {$bannerFolder}", ['full_path' => $disk->path($bannerFolder)]);
        }

        if ($request->hasFile('logo')) {
            // Delete old file if it exists physically
            if ($rawLogo && str_starts_with($rawLogo, '/storage/')) {
                $oldPath = str_replace('/storage/', '', $rawLogo);
                if ($disk->exists($oldPath)) {
                    $disk->delete($oldPath);
                    Log::info("Deleted old logo: {$oldPath}");
                }
            }
            // Use timestamp suffix to force unique filename → cache-busting on browsers/CDN
            $data['logo'] = SeoFileName::storePublic($request->file('logo'), $logoFolder, $store->slug, 'logo-' . time());
            Log::info("Uploaded new logo", [
                'path' => $data['logo'],
                'full_disk_path' => $disk->path(str_replace('/storage/', '', $data['logo'])),
                'file_exists_after_save' => $disk->exists(str_replace('/storage/', '', $data['logo'])),
            ]);
        } else {
            if ($rawLogo && str_starts_with($rawLogo, '/storage/')) {
                $existingPath = str_replace('/storage/', '', $rawLogo);
                if (!$disk->exists($existingPath)) {
                    $data['logo'] = '';
                    Log::warning("Logo file missing physically, clearing DB", ['path' => $rawLogo, 'disk_path' => $disk->path($existingPath)]);
                }
            }
        }

        if ($request->hasFile('banner')) {
            if ($rawBanner && str_starts_with($rawBanner, '/storage/')) {
                $oldPath = str_replace('/storage/', '', $rawBanner);
                if ($disk->exists($oldPath)) {
                    $disk->delete($oldPath);
                    Log::info("Deleted old banner: {$oldPath}");
                }
            }
            // Timestamp suffix → unique filename → cache-busting
            $data['banner'] = SeoFileName::storePublic($request->file('banner'), $bannerFolder, $store->slug, 'banner-' . time());
            Log::info("Uploaded new banner", [
                'path' => $data['banner'],
                'full_disk_path' => $disk->path(str_replace('/storage/', '', $data['banner'])),
                'file_exists_after_save' => $disk->exists(str_replace('/storage/', '', $data['banner'])),
            ]);
        } else {
            if ($rawBanner && str_starts_with($rawBanner, '/storage/')) {
                $existingPath = str_replace('/storage/', '', $rawBanner);
                if (!$disk->exists($existingPath)) {
                    $data['banner'] = '';
                    Log::warning("Banner file missing physically, clearing DB", ['path' => $rawBanner, 'disk_path' => $disk->path($existingPath)]);
                }
            }
        }

        // ─── Snapshot BEFORE update for diff ───
        $beforeSnap = $store->only([
            'name', 'description', 'province', 'city', 'whatsapp', 'email', 'phone',
            'whatsapp_message', 'whatsapp_orders_enabled', 'show_stock',
            'meta_title', 'meta_description', 'meta_keywords',
            'announcement', 'announcement_active', 'min_order_value',
        ]);

        // Log the actual payload being applied (excluding heavy strings)
        $logData = collect($data)->map(function ($v) {
            if (is_string($v) && strlen($v) > 120) return substr($v, 0, 120) . '…(' . strlen($v) . ' chars)';
            return $v;
        })->toArray();
        Log::info('=== STORE SETTINGS PAYLOAD ===', [
            'store_id' => $store->id,
            'fillable_keys' => array_intersect_key($logData, array_flip($store->getFillable())),
            'rejected_keys' => array_diff_key($logData, array_flip($store->getFillable())),
        ]);

        $updated = $store->update($data);
        $store->refresh();

        $afterSnap = $store->only(array_keys($beforeSnap));
        $changedFields = [];
        foreach ($beforeSnap as $k => $bv) {
            $av = $afterSnap[$k] ?? null;
            if ($bv !== $av) $changedFields[$k] = ['from' => $bv, 'to' => $av];
        }

        Log::info('=== STORE SETTINGS SAVED ===', [
            'store_id' => $store->id,
            'update_result' => $updated,
            'logo_saved' => $store->getRawOriginal('logo'),
            'banner_saved' => $store->getRawOriginal('banner'),
            'fields_changed' => $changedFields,
            'changed_count' => count($changedFields),
        ]);

        return response()->json($store->load('user'));
    }
}
