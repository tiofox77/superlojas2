<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\FacebookService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class FacebookController extends Controller
{
    /** Ensure a feed key exists; return it. */
    private function feedKey(): string
    {
        $key = Setting::get('facebook_feed_key');
        if (!$key) {
            $key = Str::random(40);
            Setting::set('facebook_feed_key', $key);
        }
        return $key;
    }

    public function config()
    {
        $mask = fn (?string $v) => $v ? '••••••' . mb_substr($v, -4) : null;
        $key = $this->feedKey();

        return response()->json([
            'enabled' => filter_var(Setting::get('facebook_enabled', false), FILTER_VALIDATE_BOOL),
            'access_token_set' => (bool) Setting::get('facebook_access_token'),
            'access_token_preview' => $mask(Setting::get('facebook_access_token')),
            'catalog_id' => Setting::get('facebook_catalog_id'),
            'business_id' => Setting::get('facebook_business_id'),
            'currency' => Setting::get('facebook_currency', 'AOA'),
            'last_sync' => Setting::get('facebook_last_sync'),
            'feed_url' => rtrim(config('app.url'), '/') . '/api/feed/facebook?key=' . $key,
        ]);
    }

    public function saveConfig(Request $request)
    {
        $data = $request->validate([
            'facebook_enabled' => 'sometimes|boolean',
            'facebook_access_token' => 'sometimes|nullable|string|max:1000',
            'facebook_catalog_id' => 'sometimes|nullable|string|max:64',
            'facebook_business_id' => 'sometimes|nullable|string|max:64',
            'facebook_currency' => 'sometimes|nullable|string|max:8',
        ]);

        foreach (['facebook_catalog_id', 'facebook_business_id', 'facebook_currency'] as $k) {
            if (array_key_exists($k, $data)) {
                Setting::set($k, $data[$k] ?? '');
            }
        }
        if (array_key_exists('facebook_enabled', $data)) {
            Setting::set('facebook_enabled', $data['facebook_enabled'] ? '1' : '0');
        }
        // Secret: only overwrite when provided.
        if (!empty($data['facebook_access_token'])) {
            Setting::set('facebook_access_token', $data['facebook_access_token']);
        }

        return response()->json(['message' => 'Configuração do Facebook guardada.']);
    }

    public function test(FacebookService $fb)
    {
        return response()->json($fb->testConnection());
    }

    public function sync(FacebookService $fb)
    {
        $result = $fb->syncAll();
        return response()->json($result, $result['ok'] ? 200 : 422);
    }

    /** Regenerate the feed key (invalidates the old feed URL). */
    public function regenerateFeedKey()
    {
        $key = Str::random(40);
        Setting::set('facebook_feed_key', $key);
        return response()->json(['feed_url' => rtrim(config('app.url'), '/') . '/api/feed/facebook?key=' . $key]);
    }

    /**
     * PUBLIC — Facebook pulls this CSV feed on a schedule. Protected by a key
     * in the query string (the URL only the admin knows and gives to Facebook).
     */
    public function feed(Request $request, FacebookService $fb)
    {
        $key = Setting::get('facebook_feed_key');
        if (!$key || !hash_equals($key, (string) $request->query('key'))) {
            abort(403, 'Chave de feed inválida.');
        }

        $csv = $fb->buildCsvFeed();
        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=utf-8',
            'Content-Disposition' => 'inline; filename="superloja-facebook-feed.csv"',
            'Cache-Control' => 'public, max-age=1800',
        ]);
    }
}
