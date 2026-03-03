<?php

namespace App\Http\Controllers\Api\StorePanel;

use App\Http\Controllers\Controller;
use App\Models\PageView;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    private function getStore(Request $request, string $slug): Store
    {
        $store = Store::where('slug', $slug)->firstOrFail();
        $user = $request->user();
        if ($user->role !== 'super_admin' && !($user->role === 'store_owner' && $user->store_id === $store->id)) {
            abort(403, 'Sem permissao.');
        }

        $store->load('plan');
        if (!$store->plan || !$store->plan->analytics) {
            abort(403, 'O seu plano nao inclui Analytics. Faca upgrade para um plano com analytics.');
        }

        return $store;
    }

    /**
     * Check if the store has analytics access (used by frontend to gate the page).
     */
    public function check(Request $request, string $slug)
    {
        $store = Store::where('slug', $slug)->firstOrFail();
        $user = $request->user();
        if ($user->role !== 'super_admin' && !($user->role === 'store_owner' && $user->store_id === $store->id)) {
            abort(403);
        }
        $store->load('plan');
        return response()->json([
            'has_analytics' => $store->plan && $store->plan->analytics,
            'plan' => $store->plan ? $store->plan->name : 'Sem plano',
        ]);
    }

    /**
     * Main dashboard: summary cards + daily chart for this store.
     */
    public function dashboard(Request $request, string $slug)
    {
        $store = $this->getStore($request, $slug);
        $days = (int) $request->get('days', 30);
        $from = now()->subDays($days)->startOfDay();

        $query = PageView::where('store_slug', $store->slug);

        // Summary
        $totalViews = (clone $query)->where('created_at', '>=', $from)->count();
        $uniqueVisitors = (clone $query)->where('created_at', '>=', $from)->where('is_unique_today', true)->count();
        $todayViews = (clone $query)->whereDate('created_at', today())->count();
        $todayUnique = (clone $query)->whereDate('created_at', today())->where('is_unique_today', true)->count();

        // Bounce rate
        $totalSessions = (clone $query)->where('created_at', '>=', $from)->distinct('session_id')->count('session_id');
        $singlePage = DB::table('page_views')
            ->where('store_slug', $store->slug)
            ->where('created_at', '>=', $from)
            ->select('session_id')
            ->groupBy('session_id')
            ->havingRaw('COUNT(*) = 1')
            ->get()->count();
        $bounceRate = $totalSessions > 0 ? round(($singlePage / $totalSessions) * 100, 1) : 0;
        $avgPages = $totalSessions > 0 ? round($totalViews / $totalSessions, 1) : 0;

        // Previous period comparison
        $prevFrom = now()->subDays($days * 2)->startOfDay();
        $prevTo = $from;
        $prevViews = (clone $query)->whereBetween('created_at', [$prevFrom, $prevTo])->count();
        $prevUnique = (clone $query)->whereBetween('created_at', [$prevFrom, $prevTo])->where('is_unique_today', true)->count();
        $viewsChange = $prevViews > 0 ? round((($totalViews - $prevViews) / $prevViews) * 100, 1) : 0;
        $uniqueChange = $prevUnique > 0 ? round((($uniqueVisitors - $prevUnique) / $prevUnique) * 100, 1) : 0;

        // Daily chart
        $dailyChart = (clone $query)->where('created_at', '>=', $from)
            ->select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('COUNT(*) as views'),
                DB::raw('SUM(is_unique_today) as visitors')
            )
            ->groupBy('date')->orderBy('date')->get();

        // Hourly chart (today)
        $hourlyChart = (clone $query)->whereDate('created_at', today())
            ->select(
                DB::raw('HOUR(created_at) as hour'),
                DB::raw('COUNT(*) as views')
            )
            ->groupBy('hour')->orderBy('hour')->get();

        return response()->json([
            'summary' => [
                'total_views' => $totalViews,
                'unique_visitors' => $uniqueVisitors,
                'today_views' => $todayViews,
                'today_unique' => $todayUnique,
                'bounce_rate' => $bounceRate,
                'avg_pages' => $avgPages,
                'views_change' => $viewsChange,
                'unique_change' => $uniqueChange,
            ],
            'daily_chart' => $dailyChart,
            'hourly_chart' => $hourlyChart,
        ]);
    }

    /**
     * Top pages within this store.
     */
    public function topPages(Request $request, string $slug)
    {
        $store = $this->getStore($request, $slug);
        $days = (int) $request->get('days', 30);
        $limit = (int) $request->get('limit', 10);
        $from = now()->subDays($days)->startOfDay();

        // All pages that include this store slug
        $pages = PageView::where('store_slug', $store->slug)
            ->where('created_at', '>=', $from)
            ->select('path', DB::raw('COUNT(*) as views'), DB::raw('COUNT(DISTINCT session_id) as unique_views'))
            ->groupBy('path')
            ->orderByDesc('views')
            ->limit($limit)
            ->get();

        return response()->json($pages);
    }

    /**
     * Traffic sources / referrers for this store.
     */
    public function referrers(Request $request, string $slug)
    {
        $store = $this->getStore($request, $slug);
        $days = (int) $request->get('days', 30);
        $from = now()->subDays($days)->startOfDay();

        $query = PageView::where('store_slug', $store->slug)->where('created_at', '>=', $from);

        $topReferrers = (clone $query)->whereNotNull('referrer_domain')
            ->select('referrer_domain', DB::raw('COUNT(*) as visits'))
            ->groupBy('referrer_domain')
            ->orderByDesc('visits')
            ->limit(10)
            ->get();

        $total = (clone $query)->count();
        $directCount = (clone $query)->whereNull('referrer_domain')->count();
        $referredCount = $total - $directCount;

        return response()->json([
            'top_referrers' => $topReferrers,
            'sources' => [
                ['source' => 'Directo', 'count' => $directCount],
                ['source' => 'Referencia', 'count' => $referredCount],
            ],
        ]);
    }

    /**
     * Geography data for this store.
     */
    public function geography(Request $request, string $slug)
    {
        $store = $this->getStore($request, $slug);
        $days = (int) $request->get('days', 30);
        $from = now()->subDays($days)->startOfDay();

        $countries = PageView::where('store_slug', $store->slug)
            ->where('created_at', '>=', $from)
            ->whereNotNull('country')
            ->select('country', DB::raw('COUNT(*) as visits'), DB::raw('SUM(is_unique_today) as unique_visits'))
            ->groupBy('country')
            ->orderByDesc('visits')
            ->limit(10)
            ->get();

        return response()->json(['countries' => $countries]);
    }

    /**
     * Technology breakdown for this store.
     */
    public function technology(Request $request, string $slug)
    {
        $store = $this->getStore($request, $slug);
        $days = (int) $request->get('days', 30);
        $from = now()->subDays($days)->startOfDay();

        $query = PageView::where('store_slug', $store->slug)->where('created_at', '>=', $from);

        $devices = (clone $query)->whereNotNull('device')
            ->select('device as name', DB::raw('COUNT(*) as count'))
            ->groupBy('device')->orderByDesc('count')->get();

        $browsers = (clone $query)->whereNotNull('browser')
            ->select('browser as name', DB::raw('COUNT(*) as count'))
            ->groupBy('browser')->orderByDesc('count')->get();

        return response()->json(['devices' => $devices, 'browsers' => $browsers]);
    }
}
