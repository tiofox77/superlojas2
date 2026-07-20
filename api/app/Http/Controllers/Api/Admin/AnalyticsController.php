<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\PageView;
use App\Models\User;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    /**
     * SQL expression for a "session": the real session_key when present,
     * falling back to the persistent visitor id for pre-migration rows /
     * environments. Cached per request.
     */
    private function sessionExpr(): string
    {
        static $has = null;
        if ($has === null) {
            $has = \Illuminate\Support\Facades\Schema::hasColumn('page_views', 'session_key');
        }
        return $has ? 'COALESCE(session_key, session_id)' : 'session_id';
    }

    /**
     * Main dashboard: summary cards + chart data.
     */
    public function dashboard(Request $request)
    {
        $days = (int) $request->get('days', 30);
        $from = now()->subDays($days)->startOfDay();

        // Summary cards
        $totalViews = PageView::where('created_at', '>=', $from)->count();
        // Unique visitors over the whole period = distinct persistent visitor id
        // (session_id). Summing the per-day is_unique_today flag over-counts
        // returning visitors (once per day). See tracking: session_id is stable.
        $uniqueVisitors = PageView::where('created_at', '>=', $from)->distinct('session_id')->count('session_id');
        $todayViews = PageView::whereDate('created_at', today())->count();
        $todayUnique = PageView::whereDate('created_at', today())->where('is_unique_today', true)->count();
        $loggedInUsers = PageView::where('created_at', '>=', $from)->whereNotNull('user_id')->distinct('user_id')->count('user_id');
        $storesAccessed = PageView::where('created_at', '>=', $from)->whereNotNull('store_slug')->distinct('store_slug')->count('store_slug');

        // Bounce rate: real sessions (30-min window) with only 1 page view.
        $sessionExpr = $this->sessionExpr();
        $totalSessions = PageView::where('created_at', '>=', $from)
            ->count(DB::raw("DISTINCT {$sessionExpr}"));
        $singlePageSessions = DB::table('page_views')
            ->where('created_at', '>=', $from)
            ->select(DB::raw("{$sessionExpr} as sk"))
            ->groupBy('sk')
            ->havingRaw('COUNT(*) = 1')
            ->get()
            ->count();
        $bounceRate = $totalSessions > 0 ? round(($singlePageSessions / $totalSessions) * 100, 1) : 0;

        // Average pages per session
        $avgPages = $totalSessions > 0 ? round($totalViews / $totalSessions, 1) : 0;

        // Previous period comparison
        $prevFrom = now()->subDays($days * 2)->startOfDay();
        $prevTo = $from;
        $prevViews = PageView::whereBetween('created_at', [$prevFrom, $prevTo])->count();
        $prevUnique = PageView::whereBetween('created_at', [$prevFrom, $prevTo])->distinct('session_id')->count('session_id');
        $viewsChange = $prevViews > 0 ? round((($totalViews - $prevViews) / $prevViews) * 100, 1) : 0;
        $uniqueChange = $prevUnique > 0 ? round((($uniqueVisitors - $prevUnique) / $prevUnique) * 100, 1) : 0;

        // Daily chart (views + unique)
        $dailyChart = PageView::where('created_at', '>=', $from)
            ->select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('COUNT(*) as views'),
                DB::raw('SUM(is_unique_today) as visitors')
            )
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn ($r) => ['date' => $r->date, 'views' => (int) $r->views, 'visitors' => (int) $r->visitors]);

        // Hourly distribution (today)
        $hourlyChart = PageView::whereDate('created_at', today())
            ->select(
                DB::raw('HOUR(created_at) as hour'),
                DB::raw('COUNT(*) as views')
            )
            ->groupBy('hour')
            ->orderBy('hour')
            ->get()
            ->keyBy('hour');

        $hourly = [];
        for ($h = 0; $h < 24; $h++) {
            $hourly[] = [
                'hour' => sprintf('%02d:00', $h),
                'views' => (int) (optional($hourlyChart[$h] ?? null)->views ?? 0),
            ];
        }

        return response()->json([
            'summary' => [
                'total_views' => $totalViews,
                'unique_visitors' => $uniqueVisitors,
                'today_views' => $todayViews,
                'today_unique' => $todayUnique,
                'logged_in_users' => $loggedInUsers,
                'stores_accessed' => $storesAccessed,
                'bounce_rate' => $bounceRate,
                'avg_pages' => $avgPages,
                'views_change' => $viewsChange,
                'unique_change' => $uniqueChange,
            ],
            'daily_chart' => $dailyChart,
            'hourly_chart' => $hourly,
        ]);
    }

    /**
     * Top pages.
     */
    public function topPages(Request $request)
    {
        $days = (int) $request->get('days', 30);
        $from = now()->subDays($days)->startOfDay();
        $limit = min((int) $request->get('limit', 20), 50);

        $pages = PageView::where('created_at', '>=', $from)
            ->select('path', DB::raw('COUNT(*) as views'), DB::raw('SUM(is_unique_today) as visitors'))
            ->groupBy('path')
            ->orderByDesc('views')
            ->limit($limit)
            ->get()
            ->map(fn ($r) => ['path' => $r->path, 'views' => (int) $r->views, 'visitors' => (int) $r->visitors]);

        return response()->json($pages);
    }

    /**
     * Top stores by views.
     */
    public function topStores(Request $request)
    {
        $days = (int) $request->get('days', 30);
        $from = now()->subDays($days)->startOfDay();
        $limit = min((int) $request->get('limit', 20), 50);

        $rows = PageView::where('created_at', '>=', $from)
            ->whereNotNull('store_slug')
            ->select('store_slug', DB::raw('COUNT(*) as views'), DB::raw('SUM(is_unique_today) as visitors'))
            ->groupBy('store_slug')
            ->orderByDesc('views')
            ->limit($limit)
            ->get();

        // Batch-load stores once (avoids an N+1 query per row).
        $storesBySlug = Store::whereIn('slug', $rows->pluck('store_slug'))->get(['slug', 'name', 'logo'])->keyBy('slug');

        $stores = $rows->map(function ($row) use ($storesBySlug) {
            $store = $storesBySlug->get($row->store_slug);
            $row->store_name = $store?->name ?? $row->store_slug;
            $row->store_logo = $store?->logo ?? null;
            $row->views = (int) $row->views;
            $row->visitors = (int) $row->visitors;
            return $row;
        });

        return response()->json($stores);
    }

    /**
     * Referrer sources.
     */
    public function referrers(Request $request)
    {
        $days = (int) $request->get('days', 30);
        $from = now()->subDays($days)->startOfDay();
        $limit = min((int) $request->get('limit', 20), 50);

        $referrers = PageView::where('created_at', '>=', $from)
            ->whereNotNull('referrer_domain')
            ->select('referrer_domain', DB::raw('COUNT(*) as views'), DB::raw('SUM(is_unique_today) as visitors'))
            ->groupBy('referrer_domain')
            ->orderByDesc('views')
            ->limit($limit)
            ->get()
            ->map(fn ($r) => ['referrer_domain' => $r->referrer_domain, 'views' => (int) $r->views, 'visitors' => (int) $r->visitors]);

        // Also: traffic sources breakdown (direct, search, social, referral)
        $totalPeriod = PageView::where('created_at', '>=', $from)->count();
        $directCount = PageView::where('created_at', '>=', $from)->whereNull('referrer_domain')->count();
        $searchDomains = ['google.com', 'google.co.ao', 'bing.com', 'yahoo.com', 'duckduckgo.com', 'baidu.com', 'yandex.com'];
        $socialDomains = ['facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'tiktok.com', 'linkedin.com', 'youtube.com', 't.co', 'wa.me', 'web.whatsapp.com'];

        $searchCount = PageView::where('created_at', '>=', $from)->whereIn('referrer_domain', $searchDomains)->count();
        $socialCount = PageView::where('created_at', '>=', $from)->whereIn('referrer_domain', $socialDomains)->count();
        $referralCount = $totalPeriod - $directCount - $searchCount - $socialCount;

        return response()->json([
            'top_referrers' => $referrers,
            'sources' => [
                ['source' => 'Directo', 'views' => $directCount, 'pct' => $totalPeriod > 0 ? round($directCount / $totalPeriod * 100, 1) : 0],
                ['source' => 'Pesquisa', 'views' => $searchCount, 'pct' => $totalPeriod > 0 ? round($searchCount / $totalPeriod * 100, 1) : 0],
                ['source' => 'Redes Sociais', 'views' => $socialCount, 'pct' => $totalPeriod > 0 ? round($socialCount / $totalPeriod * 100, 1) : 0],
                ['source' => 'Referencia', 'views' => max(0, $referralCount), 'pct' => $totalPeriod > 0 ? round(max(0, $referralCount) / $totalPeriod * 100, 1) : 0],
            ],
        ]);
    }

    /**
     * Geographic data.
     */
    public function geography(Request $request)
    {
        $days = (int) $request->get('days', 30);
        $from = now()->subDays($days)->startOfDay();

        $countries = PageView::where('created_at', '>=', $from)
            ->select('country', DB::raw('COUNT(*) as views'), DB::raw('SUM(is_unique_today) as visitors'))
            ->groupBy('country')
            ->orderByDesc('views')
            ->limit(20)
            ->get()
            ->map(fn ($r) => ['country' => $r->country, 'views' => (int) $r->views, 'visitors' => (int) $r->visitors]);

        $provinces = PageView::where('created_at', '>=', $from)
            ->whereNotNull('province')
            ->select('province', DB::raw('COUNT(*) as views'))
            ->groupBy('province')
            ->orderByDesc('views')
            ->limit(20)
            ->get()
            ->map(fn ($r) => ['province' => $r->province, 'views' => (int) $r->views]);

        return response()->json([
            'countries' => $countries,
            'provinces' => $provinces,
        ]);
    }

    /**
     * Search terms and search engines.
     */
    public function search(Request $request)
    {
        $days = (int) $request->get('days', 30);
        $from = now()->subDays($days)->startOfDay();

        $searchTerms = PageView::where('created_at', '>=', $from)
            ->whereNotNull('search_term')
            ->where('search_term', '!=', '')
            ->select('search_term', DB::raw('COUNT(*) as views'))
            ->groupBy('search_term')
            ->orderByDesc('views')
            ->limit(20)
            ->get()
            ->map(fn ($r) => ['term' => $r->search_term, 'views' => (int) $r->views]);

        $searchEngines = PageView::where('created_at', '>=', $from)
            ->whereNotNull('search_engine')
            ->select('search_engine', DB::raw('COUNT(*) as views'))
            ->groupBy('search_engine')
            ->orderByDesc('views')
            ->get()
            ->map(fn ($r) => ['engine' => $r->search_engine, 'views' => (int) $r->views]);

        return response()->json([
            'search_terms' => $searchTerms,
            'search_engines' => $searchEngines,
        ]);
    }

    /**
     * Technology breakdown (device, browser, OS).
     */
    public function technology(Request $request)
    {
        $days = (int) $request->get('days', 30);
        $from = now()->subDays($days)->startOfDay();

        $devices = PageView::where('created_at', '>=', $from)
            ->whereNotNull('device')
            ->select('device', DB::raw('COUNT(*) as views'))
            ->groupBy('device')
            ->orderByDesc('views')
            ->get()
            ->map(fn ($r) => ['device' => $r->device, 'views' => (int) $r->views]);

        $browsers = PageView::where('created_at', '>=', $from)
            ->whereNotNull('browser')
            ->select('browser', DB::raw('COUNT(*) as views'))
            ->groupBy('browser')
            ->orderByDesc('views')
            ->get()
            ->map(fn ($r) => ['browser' => $r->browser, 'views' => (int) $r->views]);

        $oses = PageView::where('created_at', '>=', $from)
            ->whereNotNull('os')
            ->select('os', DB::raw('COUNT(*) as views'))
            ->groupBy('os')
            ->orderByDesc('views')
            ->get()
            ->map(fn ($r) => ['os' => $r->os, 'views' => (int) $r->views]);

        return response()->json([
            'devices' => $devices,
            'browsers' => $browsers,
            'operating_systems' => $oses,
        ]);
    }

    /**
     * Realtime: last 30 minutes activity.
     */
    public function realtime()
    {
        $since = now()->subMinutes(30);

        $activeNow = PageView::where('created_at', '>=', $since)->distinct('session_id')->count('session_id');
        $activePages = PageView::where('created_at', '>=', $since)
            ->select('path', DB::raw('COUNT(DISTINCT session_id) as active'))
            ->groupBy('path')
            ->orderByDesc('active')
            ->limit(10)
            ->get();

        // Recent page views stream
        $recent = PageView::where('created_at', '>=', now()->subMinutes(5))
            ->orderByDesc('created_at')
            ->limit(20)
            ->get(['path', 'country', 'device', 'browser', 'referrer_domain', 'store_slug', 'created_at']);

        return response()->json([
            'active_visitors' => $activeNow,
            'active_pages' => $activePages,
            'recent_views' => $recent,
        ]);
    }

    /**
     * Detailed log for reports page.
     */
    public function logs(Request $request)
    {
        $query = PageView::orderByDesc('created_at');

        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }
        if ($request->has('store')) {
            $query->where('store_slug', $request->store);
        }
        if ($request->has('country')) {
            $query->where('country', $request->country);
        }
        if ($request->has('device')) {
            $query->where('device', $request->device);
        }
        if ($request->has('search')) {
            $q = $request->search;
            $query->where(function ($qb) use ($q) {
                $qb->where('path', 'like', "%{$q}%")
                    ->orWhere('referrer_domain', 'like', "%{$q}%")
                    ->orWhere('country', 'like', "%{$q}%");
            });
        }

        return response()->json(
            $query->paginate(min((int) $request->get('per_page', 50), 200))
        );
    }

    /**
     * Online users (with auth) — currently active.
     */
    public function onlineUsers()
    {
        $since = now()->subMinutes(15);

        // Pull recent authed views (15-min window is small) and reduce in PHP to
        // get the ACTUAL most-recent path per user. MAX(path) in SQL returns the
        // lexicographically-largest path, not the last one visited.
        $rows = PageView::where('created_at', '>=', $since)
            ->whereNotNull('user_id')
            ->orderByDesc('created_at')
            ->get(['user_id', 'path', 'created_at']);

        $latest = [];
        foreach ($rows as $r) {
            if (!isset($latest[$r->user_id])) {
                $latest[$r->user_id] = ['last_seen' => $r->created_at, 'last_page' => $r->path];
            }
        }
        $userIds = array_slice(array_keys($latest), 0, 50);

        // Batch-load users and their store names once (avoids N+1).
        $users = User::whereIn('id', $userIds)->get(['id', 'name', 'email', 'role', 'store_id'])->keyBy('id');
        $storesByUser = Store::whereIn('user_id', $userIds)->get(['user_id', 'name'])->groupBy('user_id');

        $result = collect($userIds)->map(function ($uid) use ($latest, $users, $storesByUser) {
            $user = $users->get($uid);
            if (!$user) return null;
            $stores = $storesByUser->get($uid);
            return [
                'user_id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'store_name' => $stores && $stores->isNotEmpty() ? $stores->first()->name : null,
                'last_seen' => $latest[$uid]['last_seen'],
                'last_page' => $latest[$uid]['last_page'],
            ];
        })->filter()->values();

        return response()->json($result);
    }
}
