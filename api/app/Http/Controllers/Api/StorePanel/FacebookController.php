<?php

namespace App\Http\Controllers\Api\StorePanel;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Services\FacebookService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class FacebookController extends Controller
{
    private function getStore(Request $request, string $slug): Store
    {
        $store = Store::where('slug', $slug)->firstOrFail();
        $user = $request->user();
        if ($user->role !== 'super_admin' && !($user->role === 'store_owner' && (int) $store->user_id === (int) $user->id)) {
            abort(403, 'Sem permissao.');
        }
        return $store;
    }

    private function feedKey(Store $store): string
    {
        if (!$store->fb_feed_key) {
            $store->forceFill(['fb_feed_key' => Str::random(40)])->save();
        }
        return $store->fb_feed_key;
    }

    private function feedUrl(Store $store): string
    {
        return rtrim(config('app.url'), '/') . '/api/feed/facebook/' . $store->slug . '?key=' . $this->feedKey($store);
    }

    public function config(Request $request, string $slug)
    {
        $store = $this->getStore($request, $slug);
        $mask = fn (?string $v) => $v ? '••••••' . mb_substr($v, -4) : null;

        return response()->json([
            'enabled' => (bool) $store->fb_enabled,
            'access_token_set' => (bool) $store->fb_access_token,
            'access_token_preview' => $mask($store->fb_access_token),
            'catalog_id' => $store->fb_catalog_id,
            'business_id' => $store->fb_business_id,
            'currency' => $store->fb_currency ?: 'AOA',
            'last_sync' => $store->fb_last_synced_at,
            'feed_url' => $this->feedUrl($store),
        ]);
    }

    public function saveConfig(Request $request, string $slug)
    {
        $store = $this->getStore($request, $slug);

        $data = $request->validate([
            'fb_enabled' => 'sometimes|boolean',
            'fb_access_token' => 'sometimes|nullable|string|max:1000',
            'fb_catalog_id' => 'sometimes|nullable|string|max:64',
            'fb_business_id' => 'sometimes|nullable|string|max:64',
            'fb_currency' => 'sometimes|nullable|string|max:8',
        ]);

        foreach (['fb_catalog_id', 'fb_business_id', 'fb_currency'] as $k) {
            if (array_key_exists($k, $data)) {
                $store->{$k} = $data[$k] ?? '';
            }
        }
        if (array_key_exists('fb_enabled', $data)) {
            $store->fb_enabled = (bool) $data['fb_enabled'];
        }
        // Secret: only overwrite when provided.
        if (!empty($data['fb_access_token'])) {
            $store->fb_access_token = $data['fb_access_token'];
        }
        $store->save();

        return response()->json(['message' => 'Configuração do Facebook guardada.']);
    }

    public function test(Request $request, string $slug)
    {
        $store = $this->getStore($request, $slug);
        return response()->json((new FacebookService($store))->testConnection());
    }

    public function sync(Request $request, string $slug)
    {
        $store = $this->getStore($request, $slug);
        $result = (new FacebookService($store))->syncAll();
        return response()->json($result, $result['ok'] ? 200 : 422);
    }

    public function regenerateFeedKey(Request $request, string $slug)
    {
        $store = $this->getStore($request, $slug);
        $store->forceFill(['fb_feed_key' => Str::random(40)])->save();
        return response()->json(['feed_url' => $this->feedUrl($store)]);
    }

    /**
     * PUBLIC — Facebook pulls this per-store CSV feed. Key-protected.
     */
    public function feed(Request $request, string $slug)
    {
        $store = Store::where('slug', $slug)->first();
        if (!$store || !$store->fb_feed_key || !hash_equals($store->fb_feed_key, (string) $request->query('key'))) {
            abort(403, 'Chave de feed inválida.');
        }

        $csv = (new FacebookService($store))->buildCsvFeed();
        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=utf-8',
            'Content-Disposition' => 'inline; filename="' . $store->slug . '-facebook-feed.csv"',
            'Cache-Control' => 'public, max-age=1800',
        ]);
    }
}
