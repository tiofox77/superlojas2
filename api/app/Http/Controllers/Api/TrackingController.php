<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PageView;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TrackingController extends Controller
{
    public function track(Request $request)
    {
        $request->validate([
            'path'       => 'required|string|max:500',
            'referrer'   => 'nullable|string|max:1000',
            'visitor_id' => 'nullable|string|max:64',
        ]);

        $ip = $request->ip();
        $ipHash = hash('sha256', $ip . config('app.key'));
        $today = now()->format('Y-m-d');

        // Visitor ID from localStorage (sent in body)
        $visitorId = $request->input('visitor_id');
        if (!$visitorId) {
            $visitorId = $ipHash; // fallback to ip hash
        }

        $visitorHash = hash('sha256', $visitorId . $today);

        // Check if this visitor already counted today
        $isUniqueToday = !PageView::where('visitor_hash', $visitorHash)
            ->whereDate('created_at', $today)
            ->exists();

        // Parse referrer domain
        $referrer = $request->input('referrer');
        $referrerDomain = null;
        if ($referrer) {
            try {
                $parsed = parse_url($referrer);
                $referrerDomain = $parsed['host'] ?? null;
                if ($referrerDomain && str_starts_with($referrerDomain, 'www.')) {
                    $referrerDomain = substr($referrerDomain, 4);
                }
                // Skip self-referrals
                $appHost = parse_url(config('app.url'), PHP_URL_HOST);
                if ($referrerDomain === $appHost || $referrerDomain === 'localhost' || $referrerDomain === 'lojas.test') {
                    $referrer = null;
                    $referrerDomain = null;
                }
            } catch (\Throwable $e) {
                $referrerDomain = null;
            }
        }

        // Parse user agent
        $ua = $request->userAgent() ?? '';
        $device = $this->detectDevice($ua);
        $browser = $this->detectBrowser($ua);
        $os = $this->detectOS($ua);

        // Extract store slug from path (e.g. /lojas/minha-loja)
        $path = $request->input('path');
        $storeSlug = null;
        if (preg_match('#^/lojas/([a-z0-9\-]+)#i', $path, $m)) {
            $storeSlug = $m[1];
        } elseif (preg_match('#^/loja/([a-z0-9\-]+)#i', $path, $m)) {
            $storeSlug = $m[1];
        }

        // Geo: use Accept-Language as a rough country hint
        $country = $this->detectCountryFromHeaders($request);
        $province = $request->header('X-Province') ?? null;

        // Get authenticated user if any (via Bearer token)
        $userId = null;
        try {
            $user = $request->user('sanctum');
            if ($user) $userId = $user->id;
        } catch (\Throwable $e) {}

        PageView::create([
            'session_id'      => substr($visitorId, 0, 64),
            'visitor_hash'    => $visitorHash,
            'path'            => Str::limit($path, 500),
            'store_slug'      => $storeSlug,
            'referrer'        => $referrer ? Str::limit($referrer, 1000) : null,
            'referrer_domain' => $referrerDomain,
            'country'         => $country,
            'province'        => $province,
            'city'            => null,
            'device'          => $device,
            'browser'         => $browser,
            'os'              => $os,
            'ip_hash'         => $ipHash,
            'user_id'         => $userId,
            'is_unique_today' => $isUniqueToday,
            'created_at'      => now(),
        ]);

        return response()->json(['ok' => true]);
    }

    private function detectDevice(string $ua): string
    {
        if (preg_match('/Mobile|Android.*Mobile|iPhone|iPod/i', $ua)) return 'mobile';
        if (preg_match('/Tablet|iPad|Android(?!.*Mobile)/i', $ua)) return 'tablet';
        return 'desktop';
    }

    private function detectBrowser(string $ua): string
    {
        if (str_contains($ua, 'Edg/')) return 'Edge';
        if (str_contains($ua, 'OPR/') || str_contains($ua, 'Opera')) return 'Opera';
        if (str_contains($ua, 'Chrome/') && !str_contains($ua, 'Edg/')) return 'Chrome';
        if (str_contains($ua, 'Firefox/')) return 'Firefox';
        if (str_contains($ua, 'Safari/') && !str_contains($ua, 'Chrome/')) return 'Safari';
        if (str_contains($ua, 'MSIE') || str_contains($ua, 'Trident/')) return 'IE';
        return 'Other';
    }

    private function detectOS(string $ua): string
    {
        if (str_contains($ua, 'Windows')) return 'Windows';
        if (str_contains($ua, 'Macintosh') || str_contains($ua, 'Mac OS')) return 'macOS';
        if (str_contains($ua, 'Linux') && !str_contains($ua, 'Android')) return 'Linux';
        if (str_contains($ua, 'Android')) return 'Android';
        if (str_contains($ua, 'iPhone') || str_contains($ua, 'iPad')) return 'iOS';
        return 'Other';
    }

    private function detectCountryFromHeaders(Request $request): string
    {
        // Check Cloudflare/proxy headers first
        if ($cf = $request->header('CF-IPCountry')) return strtoupper($cf);
        if ($geo = $request->header('X-Country')) return $geo;

        // Parse Accept-Language as rough hint
        $lang = $request->header('Accept-Language', '');
        if (str_contains($lang, 'pt-AO') || str_contains($lang, 'pt-ao')) return 'Angola';
        if (str_contains($lang, 'pt-BR') || str_contains($lang, 'pt-br')) return 'Brasil';
        if (str_contains($lang, 'pt-PT') || str_contains($lang, 'pt-pt')) return 'Portugal';
        if (str_contains($lang, 'pt')) return 'Angola'; // Default Portuguese to Angola
        if (str_contains($lang, 'en-US')) return 'EUA';
        if (str_contains($lang, 'en-GB')) return 'Reino Unido';
        if (str_contains($lang, 'fr')) return 'Franca';
        if (str_contains($lang, 'es')) return 'Espanha';

        return 'Desconhecido';
    }
}
