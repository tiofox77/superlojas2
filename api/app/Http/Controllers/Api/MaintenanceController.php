<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ProductDemand;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

/**
 * Remote upkeep without SSH (/api/maintenance/*, token from MaintenanceTokenAuth).
 * A closed list of operations: no arbitrary commands, SQL or file writes.
 */
class MaintenanceController extends Controller
{
    /** Health overview: app, database, migrations, cache, storage, queue, business counters, last error. */
    public function status()
    {
        $checks = [];

        $t = microtime(true);
        try {
            DB::select('select 1');
            $checks['database'] = ['ok' => true, 'latency_ms' => round((microtime(true) - $t) * 1000, 1), 'driver' => DB::getDriverName()];
        } catch (\Throwable $e) {
            $checks['database'] = ['ok' => false, 'error' => $e->getMessage()];
        }

        try {
            $key = 'maintenance:probe';
            Cache::put($key, 1, 10);
            $checks['cache'] = ['ok' => Cache::get($key) === 1, 'store' => config('cache.default')];
        } catch (\Throwable $e) {
            $checks['cache'] = ['ok' => false, 'error' => $e->getMessage()];
        }

        $base = base_path();
        $checks['storage'] = [
            'public_link' => is_link(public_path('storage')) || is_dir(public_path('storage')),
            'public_writable' => is_writable(Storage::disk('public')->path('')),
            'logs_writable' => is_writable(storage_path('logs')),
            'disk_free_mb' => @disk_free_space($base) !== false ? round(disk_free_space($base) / 1048576) : null,
            'disk_total_mb' => @disk_total_space($base) !== false ? round(disk_total_space($base) / 1048576) : null,
        ];

        $checks['queue'] = [
            'connection' => config('queue.default'),
            'pending_jobs' => Schema::hasTable('jobs') ? DB::table('jobs')->count() : null,
            'failed_jobs' => Schema::hasTable('failed_jobs') ? DB::table('failed_jobs')->count() : null,
        ];

        $count = fn ($table, $cb = null) => Schema::hasTable($table) ? ($cb ? $cb(DB::table($table)) : DB::table($table))->count() : null;
        $today = now()->startOfDay();

        return response()->json([
            'app' => [
                'env' => app()->environment(),
                'debug' => (bool) config('app.debug'),
                'url' => config('app.url'),
                'laravel' => app()->version(),
                'php' => PHP_VERSION,
                'timezone' => config('app.timezone'),
                'server_time' => now()->toIso8601String(),
            ],
            'checks' => $checks,
            'migrations' => $this->migrationState(),
            'counts' => [
                'users' => $count('users'),
                'stores_approved' => $count('stores', fn ($q) => $q->where('status', 'approved')),
                'stores_pending' => $count('stores', fn ($q) => $q->where('status', 'pending')),
                'products_active' => $count('products', fn ($q) => $q->where('is_active', true)),
                'products_in_stock' => $count('products', fn ($q) => $q->where('is_active', true)->where('stock', '>', 0)),
                'orders_today' => $count('orders', fn ($q) => $q->where('created_at', '>=', $today)),
                'orders_7d' => $count('orders', fn ($q) => $q->where('created_at', '>=', now()->subDays(7))),
                'page_views_today' => $count('page_views', fn ($q) => $q->where('created_at', '>=', $today)),
            ],
            'last_error' => $this->lastLogEntry('ERROR'),
        ]);
    }

    public function migrations()
    {
        return response()->json($this->migrationState(true));
    }

    /**
     * {"file": "2026_10_15_120000_name.php"} runs that migration only (the normal way, one at a time);
     * {"all": true} runs every pending migration.
     */
    public function migrate(Request $request)
    {
        $data = $request->validate([
            'file' => ['nullable', 'string', 'regex:/^\d{4}_\d{2}_\d{2}_\d{6}_[a-z0-9_]+\.php$/'],
            'all' => 'nullable|boolean',
        ]);
        if (empty($data['file']) && empty($data['all'])) {
            return response()->json(['error' => 'Indique "file" (uma migracao) ou "all": true.'], 422);
        }
        $options = ['--force' => true];
        if (!empty($data['file'])) {
            if (!is_file(database_path('migrations/' . $data['file']))) {
                return response()->json(['error' => "Migracao {$data['file']} nao existe no servidor."], 404);
            }
            $options['--path'] = 'database/migrations/' . $data['file'];
        }

        Artisan::call('migrate', $options);
        $output = trim(Artisan::output());
        Cache::forget('products:popular:v1');
        $request->attributes->set('maintenance_summary', mb_substr(preg_replace('/\s+/', ' ', $output), 0, 400));

        return response()->json(['output' => $output, 'migrations' => $this->migrationState()]);
    }

    /** scope: app (application cache), views (compiled Blade), config (config/route/event caches), all. */
    public function clearCache(Request $request)
    {
        $scope = $request->validate(['scope' => 'nullable|in:app,views,config,all'])['scope'] ?? 'app';
        $commands = [
            'app' => ['cache:clear'],
            'views' => ['view:clear'],
            'config' => ['config:clear', 'route:clear', 'event:clear'],
            'all' => ['optimize:clear'],
        ][$scope];

        $out = [];
        foreach ($commands as $command) {
            Artisan::call($command);
            $out[$command] = trim(Artisan::output());
        }
        $request->attributes->set('maintenance_summary', "scope={$scope}");

        return response()->json(['scope' => $scope, 'output' => $out]);
    }

    /** Reset the web server's OPcache (separate from the CLI one) so freshly uploaded classes run. */
    public function opcacheReset(Request $request)
    {
        if (!function_exists('opcache_reset')) {
            return response()->json(['ok' => false, 'message' => 'OPcache nao disponivel neste servidor.']);
        }
        $status = function_exists('opcache_get_status') ? @opcache_get_status(false) : null;
        $reset = @opcache_reset();
        $request->attributes->set('maintenance_summary', $reset ? 'reset' : 'not reset');

        return response()->json([
            'ok' => (bool) $reset,
            'enabled' => (bool) ($status['opcache_enabled'] ?? false),
            'validate_timestamps' => (bool) ini_get('opcache.validate_timestamps'),
            'revalidate_freq' => (int) ini_get('opcache.revalidate_freq'),
        ]);
    }

    public function storageLink()
    {
        if (is_link(public_path('storage')) || is_dir(public_path('storage'))) {
            return response()->json(['ok' => true, 'message' => 'public/storage ja existe.']);
        }
        Artisan::call('storage:link');
        return response()->json(['ok' => true, 'output' => trim(Artisan::output())]);
    }

    /**
     * Latest entries of the newest Laravel log. ?limit=50 (max 300), ?level=error|warning|info, ?q=text.
     * Bearer tokens, passwords, API keys/secrets and e-mail addresses are masked.
     */
    public function logs(Request $request)
    {
        $limit = min(max((int) $request->query('limit', 50), 1), 300);
        $level = strtoupper((string) $request->query('level', ''));
        $q = (string) $request->query('q', '');
        $since = null;
        if ($request->filled('since')) {
            try { $since = \Carbon\Carbon::parse((string) $request->query('since')); } catch (\Throwable $e) {
                return response()->json(['error' => 'since invalido (use ISO 8601, ex.: 2026-10-15T10:00:00Z)'], 422);
            }
        }

        $file = $this->latestLogFile();
        if (!$file) return response()->json(['file' => null, 'entries' => []]);

        $entries = collect($this->parseEntries($this->tail($file, 4000)))
            ->when($level !== '', fn ($c) => $c->filter(fn ($e) => $e['level'] === $level))
            ->when($q !== '', fn ($c) => $c->filter(fn ($e) => stripos($e['message'], $q) !== false))
            ->when($since, fn ($c) => $c->filter(function ($e) use ($since) {
                try { return \Carbon\Carbon::parse($e['time'], config('app.timezone'))->greaterThanOrEqualTo($since); } catch (\Throwable $x) { return true; }
            }))
            ->take(-$limit)
            ->map(fn ($e) => [...$e, 'message' => $this->redact(mb_substr($e['message'], 0, 4000))])
            ->values();

        return response()->json([
            'file' => basename($file),
            'size_kb' => round(filesize($file) / 1024),
            'entries' => $entries,
        ]);
    }

    /** Marketplace-wide demand ranking (same score as the home highlights). */
    public function demand(Request $request, ProductDemand $demand)
    {
        $days = min(max((int) $request->query('days', 30), 1), 90);
        $scores = $demand->scores($days, null, 30);
        $products = DB::table('products')->whereIn('id', array_keys($scores))->get(['id', 'name', 'slug', 'stock', 'store_id'])->keyBy('id');

        return response()->json([
            'days' => $days,
            'products' => collect($scores)->map(fn ($s, $id) => isset($products[$id])
                ? ['id' => $id, 'name' => $products[$id]->name, 'slug' => $products[$id]->slug, 'stock' => $products[$id]->stock, 'score' => round($s, 1)]
                : null)->filter()->values(),
            'top_searches' => Schema::hasTable('search_terms_daily')
                ? DB::table('search_terms_daily')->where('day', '>=', now()->subDays($days)->toDateString())
                    ->groupBy('term', 'source')->selectRaw('term, source, SUM(count) as count, MIN(results) as min_results')
                    ->orderByDesc('count')->limit(30)->get()
                : [],
        ]);
    }

    /** Calls made with maintenance tokens (most recent first). */
    public function audit(Request $request)
    {
        $limit = min(max((int) $request->query('limit', 50), 1), 200);
        return response()->json(DB::table('maintenance_logs')->orderByDesc('id')->limit($limit)->get());
    }

    // ─── helpers ─────────────────────────────────────────────────────

    private function migrationState(bool $full = false): array
    {
        try {
            $migrator = app('migrator');
            if (!$migrator->repositoryExists()) return ['error' => 'migrations table missing'];
            $files = array_keys($migrator->getMigrationFiles(database_path('migrations')));
            $ran = $migrator->getRepository()->getRan();
            $pending = array_values(array_diff($files, $ran));
            $state = ['ran' => count($ran), 'pending' => $pending];
            if ($full) $state['last_batch'] = DB::table('migrations')->orderByDesc('id')->limit(15)->get(['migration', 'batch']);
            return $state;
        } catch (\Throwable $e) {
            return ['error' => $e->getMessage()];
        }
    }

    private function latestLogFile(): ?string
    {
        $files = glob(storage_path('logs/*.log')) ?: [];
        usort($files, fn ($a, $b) => filemtime($b) <=> filemtime($a));
        return $files[0] ?? null;
    }

    /** Last $bytes of a file, starting at a line boundary. */
    private function tail(string $file, int $maxLines): string
    {
        $size = filesize($file);
        $bytes = min($size, $maxLines * 400);
        $fh = fopen($file, 'rb');
        fseek($fh, -$bytes, SEEK_END);
        $chunk = fread($fh, $bytes);
        fclose($fh);
        if ($bytes < $size) $chunk = substr($chunk, strpos($chunk, "\n") + 1);
        return $chunk;
    }

    /** Split Laravel log text into entries: [time, level, message]. */
    private function parseEntries(string $text): array
    {
        $parts = preg_split('/^(?=\[\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2})/m', $text, -1, PREG_SPLIT_NO_EMPTY);
        $entries = [];
        foreach ($parts as $part) {
            if (preg_match('/^\[([^\]]+)\]\s+\w+\.(\w+):\s*(.*)$/s', $part, $m)) {
                $entries[] = ['time' => $m[1], 'level' => strtoupper($m[2]), 'message' => trim($m[3])];
            }
        }
        return $entries;
    }

    private function lastLogEntry(string $level): ?array
    {
        $file = $this->latestLogFile();
        if (!$file) return null;
        $entry = collect($this->parseEntries($this->tail($file, 2000)))->where('level', $level)->last();
        if (!$entry) return null;
        $first = strtok($entry['message'], "\n");
        return ['time' => $entry['time'], 'message' => $this->redact(mb_substr($first, 0, 500))];
    }

    private function redact(string $text): string
    {
        $patterns = [
            '/(Bearer\s+)[A-Za-z0-9|._\-]+/i' => '$1[redacted]',
            '/((?:password|passwd|secret|api_secret|api_key|token|access_token|app_secret)["\']?\s*[=:]\s*["\']?)[^"\'\s,&}]+/i' => '$1[redacted]',
            '/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/' => '[email]',
        ];
        return preg_replace(array_keys($patterns), array_values($patterns), $text);
    }
}
