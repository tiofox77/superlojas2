<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class SystemUpdateController extends Controller
{
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  CONFIG
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    public function config()
    {
        $repo = Setting::get('github_repo', '');
        $token = Setting::get('github_token', '');
        $version = Setting::get('current_version', '1.0.0');

        return response()->json([
            'github_repo'     => $repo,
            'has_token'       => (bool) $token,
            'token_preview'   => $token ? (substr($token, 0, 4) . '••••••••') : '',
            'current_version' => $version,
            'last_check'      => Setting::get('last_update_check'),
            'last_install'    => Setting::get('last_update_installed'),
        ]);
    }

    public function saveConfig(Request $request)
    {
        $request->validate([
            'github_repo'     => 'required|string|max:500',
            'github_token'    => 'nullable|string|max:500',
            'current_version' => 'nullable|string|max:50',
        ]);

        // Normalize repo: accept full URL, owner/repo, or with .git
        $repo = $request->github_repo;
        $repo = preg_replace('#^https?://github\.com/#', '', $repo);
        $repo = rtrim(preg_replace('#\.git$#', '', $repo), '/');

        Setting::set('github_repo', $repo);
        Log::info('SystemUpdate: config saved', ['repo' => $repo]);

        // Save token (skip if masked placeholder sent back)
        $rawToken = $request->github_token;
        if ($rawToken && !str_contains($rawToken, '••••')) {
            Setting::set('github_token', $rawToken);
            Log::info('SystemUpdate: token saved');
        }

        if ($request->filled('current_version')) {
            Setting::set('current_version', $request->current_version);
        }

        // Clear cached releases
        Cache::forget('github_releases');

        // Return fresh config so frontend updates immediately
        return response()->json([
            'message'         => 'Configuracao guardada com sucesso.',
            'github_repo'     => $repo,
            'has_token'       => (bool) Setting::get('github_token'),
            'token_preview'   => Setting::get('github_token') ? (substr(Setting::get('github_token'), 0, 4) . '••••••••') : '',
            'current_version' => Setting::get('current_version', '1.0.0'),
        ]);
    }

    public function removeToken()
    {
        Setting::where('key', 'github_token')->delete();
        Cache::forget('github_releases');
        return response()->json(['message' => 'Token removido.']);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  CONNECTION TEST
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    public function testConnection()
    {
        $repo = Setting::get('github_repo');
        if (!$repo) {
            return response()->json(['ok' => false, 'error' => 'Repositorio nao configurado. Guarde a configuracao primeiro.'], 422);
        }

        try {
            $response = $this->githubHttp(10)
                ->get("https://api.github.com/repos/{$repo}");

            if ($response->failed()) {
                $status = $response->status();
                $msgs = [
                    404 => "Repositorio '{$repo}' nao encontrado. Verifique o nome.",
                    401 => 'Token invalido ou expirado.',
                    403 => 'Acesso negado. Token sem permissoes ou rate limit excedido.',
                ];
                return response()->json([
                    'ok'    => false,
                    'error' => $msgs[$status] ?? "Erro HTTP {$status}",
                    'status' => $status,
                ]);
            }

            $data = $response->json();

            // Also check rate limit
            $rateLimit = $this->githubHttp(5)->get('https://api.github.com/rate_limit');
            $rl = $rateLimit->ok() ? $rateLimit->json()['rate'] ?? null : null;

            return response()->json([
                'ok' => true,
                'repo' => [
                    'full_name'      => $data['full_name'],
                    'description'    => $data['description'],
                    'html_url'       => $data['html_url'],
                    'default_branch' => $data['default_branch'],
                    'private'        => $data['private'],
                    'stars'          => $data['stargazers_count'],
                    'forks'          => $data['forks_count'],
                    'language'       => $data['language'],
                    'updated_at'     => $data['updated_at'],
                    'owner' => [
                        'login'      => $data['owner']['login'],
                        'avatar_url' => $data['owner']['avatar_url'],
                    ],
                ],
                'rate_limit' => $rl ? [
                    'limit'     => $rl['limit'],
                    'remaining' => $rl['remaining'],
                    'reset_at'  => date('Y-m-d H:i:s', $rl['reset']),
                ] : null,
                'authenticated' => (bool) Setting::get('github_token'),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'ok'    => false,
                'error' => 'Erro de conexao: ' . $e->getMessage(),
            ]);
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  RELEASES
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    public function releases(Request $request)
    {
        $repo = Setting::get('github_repo');
        if (!$repo) {
            return response()->json(['error' => 'Repositorio nao configurado. Guarde a configuracao primeiro.'], 422);
        }

        $forceRefresh = $request->boolean('refresh');
        $cacheKey = 'github_releases';

        if (!$forceRefresh) {
            $cached = Cache::get($cacheKey);
            if ($cached) {
                return response()->json([
                    'releases'        => $cached,
                    'cached'          => true,
                    'current_version' => Setting::get('current_version', '1.0.0'),
                ]);
            }
        }

        try {
            $response = $this->githubHttp(20)
                ->get("https://api.github.com/repos/{$repo}/releases", ['per_page' => 15]);

            if ($response->failed()) {
                $status = $response->status();
                $msgs = [
                    404 => "Repositorio '{$repo}' nao encontrado.",
                    403 => 'Rate limit excedido ou acesso negado. Adicione/verifique o token.',
                    401 => 'Token invalido ou expirado.',
                ];
                return response()->json(['error' => $msgs[$status] ?? "Erro GitHub: HTTP {$status}"], $status >= 400 && $status < 600 ? $status : 500);
            }

            $releases = collect($response->json())->filter(fn($r) => !($r['draft'] ?? false))->map(fn($r) => [
                'id'           => $r['id'],
                'tag_name'     => $r['tag_name'],
                'name'         => $r['name'] ?: $r['tag_name'],
                'body'         => $r['body'] ?? '',
                'prerelease'   => $r['prerelease'],
                'published_at' => $r['published_at'],
                'html_url'     => $r['html_url'],
                'zipball_url'  => $r['zipball_url'],
                'author'       => ['login' => $r['author']['login'] ?? '', 'avatar_url' => $r['author']['avatar_url'] ?? ''],
                'assets'       => collect($r['assets'] ?? [])->map(fn($a) => [
                    'name'     => $a['name'],
                    'size'     => $a['size'],
                    'downloads'=> $a['download_count'],
                    'url'      => $a['browser_download_url'],
                ])->toArray(),
            ])->values()->toArray();

            Setting::set('last_update_check', now()->toIso8601String());
            Cache::put($cacheKey, $releases, now()->addMinutes(5));

            return response()->json([
                'releases'        => $releases,
                'cached'          => false,
                'current_version' => Setting::get('current_version', '1.0.0'),
            ]);
        } catch (\Throwable $e) {
            Log::error('SystemUpdate: releases fetch failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Erro de conexao: ' . $e->getMessage()], 500);
        }
    }

    public function checkLatest()
    {
        $repo = Setting::get('github_repo');
        if (!$repo) {
            return response()->json(['has_update' => false]);
        }

        try {
            $response = $this->githubHttp(10)
                ->get("https://api.github.com/repos/{$repo}/releases/latest");

            if ($response->failed()) {
                return response()->json(['has_update' => false]);
            }

            $latest = $response->json();
            $currentVersion = Setting::get('current_version', '1.0.0');
            $latestTag = ltrim($latest['tag_name'] ?? '', 'vV');
            $currentClean = ltrim($currentVersion, 'vV');

            return response()->json([
                'has_update'      => version_compare($latestTag, $currentClean, '>'),
                'latest_version'  => $latest['tag_name'],
                'current_version' => $currentVersion,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['has_update' => false]);
        }
    }

    public function setVersion(Request $request)
    {
        $request->validate(['version' => 'required|string|max:50']);
        $v = ltrim($request->version, 'vV');
        Setting::set('current_version', $v);
        Cache::forget('github_releases');

        return response()->json([
            'message'         => "Versao actualizada para {$v}",
            'current_version' => $v,
        ]);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  INSTALL
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    public function install(Request $request)
    {
        $request->validate([
            'tag'         => 'required|string|max:100',
            'zipball_url' => 'required|string|url',
        ]);

        $tag = $request->tag;
        $zipUrl = $request->zipball_url;
        $repo = Setting::get('github_repo');

        if (!$repo) {
            return response()->json(['error' => 'Repositorio nao configurado.'], 422);
        }

        $projectRoot = realpath(base_path('..'));
        if (!$projectRoot || !is_dir($projectRoot)) {
            return response()->json(['error' => 'Nao foi possivel determinar a raiz do projecto.'], 500);
        }

        $steps = [];
        $tempDir = null;
        $envBackups = [];

        try {
            // ── 1. Download ──
            $steps[] = $this->step('download', 'running', 'A descarregar release...');

            $response = $this->githubHttp(120)->get($zipUrl);
            if ($response->failed()) {
                return $this->installError("Erro ao descarregar: HTTP {$response->status()}", $steps);
            }

            $zipContent = $response->body();
            if (strlen($zipContent) < 1000) {
                return $this->installError('Ficheiro zip invalido ou vazio.', $steps);
            }

            $tempDir = storage_path('app/update_' . uniqid());
            File::ensureDirectoryExists($tempDir);
            $zipPath = $tempDir . '/release.zip';
            File::put($zipPath, $zipContent);

            $steps[] = $this->step('download', 'done', 'Download concluido (' . $this->formatSize(strlen($zipContent)) . ')');

            // ── 2. Extract ──
            $steps[] = $this->step('extract', 'running', 'A extrair ficheiros...');

            $extractDir = $tempDir . '/extracted';
            File::ensureDirectoryExists($extractDir);

            if (!$this->extractZip($zipPath, $extractDir)) {
                return $this->installError('Nao foi possivel extrair o zip. Verifique php-zip ou unzip no servidor.', $steps);
            }

            $innerDirs = File::directories($extractDir);
            $sourceDir = count($innerDirs) === 1 ? $innerDirs[0] : $extractDir;

            $steps[] = $this->step('extract', 'done', 'Extraccao concluida');

            // ── 3. Backup .env ──
            $steps[] = $this->step('backup', 'running', 'A preservar configuracoes...');

            $envPaths = [$projectRoot . '/.env', $projectRoot . '/api/.env'];
            foreach ($envPaths as $ef) {
                if (File::exists($ef)) $envBackups[$ef] = File::get($ef);
            }

            $steps[] = $this->step('backup', 'done', 'Ficheiros .env preservados (' . count($envBackups) . ')');

            // ── 4. Copy files ──
            $steps[] = $this->step('copy', 'running', 'A copiar ficheiros...');

            $copied = 0;
            $skipped = 0;
            $protectedPaths = [
                '.env', 'api/.env',
                'api/bootstrap/cache',
                'api/storage/app', 'api/storage/logs',
                'api/storage/framework/sessions', 'api/storage/framework/cache',
                'node_modules', 'api/vendor',
            ];

            $this->copyDirectory($sourceDir, $projectRoot, $protectedPaths, $copied, $skipped);

            $steps[] = $this->step('copy', 'done', "{$copied} copiados, {$skipped} protegidos");

            // ── 5. Restore .env (safety) + clear stale config ──
            foreach ($envBackups as $ef => $content) {
                File::put($ef, $content);
            }
            // Clear any cached config immediately so migrations use the correct DB
            $this->safeArtisan('config:clear');

            // ── 6. Migrations ──
            $steps[] = $this->step('migrate', 'running', 'A executar migracoes...');
            $migrateOut = $this->safeArtisan('migrate', ['--force' => true]);
            $steps[] = $this->step('migrate', 'done', $migrateOut ?: 'Sem migracoes pendentes');

            // ── 7. Seeders ──
            $steps[] = $this->step('seed', 'running', 'A executar seeders...');
            $seedOut = $this->safeArtisan('db:seed', ['--class' => 'Database\\Seeders\\UpdateSeeder', '--force' => true]);
            $steps[] = $this->step('seed', 'done', $seedOut ?: 'Seeders executados');

            // ── 8. Clear caches ──
            $steps[] = $this->step('cache', 'running', 'A limpar caches...');
            foreach (['config:clear', 'route:clear', 'view:clear', 'cache:clear'] as $cmd) {
                $this->safeArtisan($cmd);
            }
            $this->safeArtisan('storage:link');
            $steps[] = $this->step('cache', 'done', 'Caches limpos + storage link verificado');

            // ── 9. Patch dist/ env ──
            $steps[] = $this->step('patch_env', 'running', 'A aplicar variaveis de ambiente...');
            $patched = $this->patchDistEnv($projectRoot);
            $steps[] = $this->step('patch_env', 'done', $patched > 0 ? "{$patched} JS actualizado(s)" : 'Sem alteracoes');

            // ── 10. Update version ──
            $cleanTag = ltrim($tag, 'vV');
            Setting::set('current_version', $cleanTag);
            Setting::set('last_update_installed', now()->toIso8601String());
            Cache::forget('github_releases');

            $steps[] = $this->step('version', 'done', "Versao: {$cleanTag}");

            // Cleanup
            File::deleteDirectory($tempDir);

            Log::info("System updated to {$tag}", ['repo' => $repo, 'copied' => $copied, 'skipped' => $skipped]);

            return response()->json([
                'message'       => "Actualizado para {$tag} com sucesso!",
                'version'       => $cleanTag,
                'steps'         => $steps,
                'files_copied'  => $copied,
                'files_skipped' => $skipped,
            ]);

        } catch (\Throwable $e) {
            if ($tempDir && File::isDirectory($tempDir)) File::deleteDirectory($tempDir);
            foreach ($envBackups as $ef => $content) File::put($ef, $content);

            Log::error("System update failed", ['error' => $e->getMessage(), 'tag' => $tag]);

            return response()->json([
                'error' => 'Erro na instalacao: ' . $e->getMessage(),
                'steps' => $steps,
            ], 500);
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  REPO INFO  (kept for backwards compat)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    public function repoInfo()
    {
        $repo = Setting::get('github_repo');
        if (!$repo) return response()->json(['error' => 'Repositorio nao configurado.'], 422);

        try {
            $response = $this->githubHttp(10)->get("https://api.github.com/repos/{$repo}");
            if ($response->failed()) return response()->json(['error' => 'Repositorio nao encontrado.'], 404);

            $data = $response->json();
            return response()->json([
                'full_name'      => $data['full_name'],
                'description'    => $data['description'],
                'html_url'       => $data['html_url'],
                'default_branch' => $data['default_branch'],
                'stars'          => $data['stargazers_count'],
                'forks'          => $data['forks_count'],
                'open_issues'    => $data['open_issues_count'],
                'language'       => $data['language'],
                'updated_at'     => $data['updated_at'],
                'private'        => $data['private'],
                'owner'          => [
                    'login'      => $data['owner']['login'],
                    'avatar_url' => $data['owner']['avatar_url'],
                ],
            ]);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  PRIVATE HELPERS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    private function githubHttp(int $timeout = 15): \Illuminate\Http\Client\PendingRequest
    {
        $headers = ['Accept' => 'application/vnd.github.v3+json', 'User-Agent' => 'SuperLojas-Updater'];
        $token = Setting::get('github_token');
        if ($token) {
            $headers['Authorization'] = 'Bearer ' . $token;
        }

        $http = Http::withHeaders($headers)->timeout($timeout);

        $caPath = ini_get('curl.cainfo') ?: ini_get('openssl.cafile');
        if ($caPath && file_exists($caPath)) {
            $http = $http->withOptions(['verify' => $caPath]);
        } else {
            $http = $http->withOptions(['verify' => false]);
        }

        return $http;
    }

    private function step(string $step, string $status, string $message): array
    {
        return compact('step', 'status', 'message');
    }

    private function installError(string $message, array $steps): \Illuminate\Http\JsonResponse
    {
        return response()->json(['error' => $message, 'steps' => $steps], 500);
    }

    private function safeArtisan(string $command, array $params = []): string
    {
        try {
            Artisan::call($command, $params);
            return trim(Artisan::output());
        } catch (\Throwable $e) {
            Log::warning("Artisan {$command} failed during update", ['error' => $e->getMessage()]);
            return 'Erro: ' . $e->getMessage();
        }
    }

    private function extractZip(string $zipPath, string $extractDir): bool
    {
        if (class_exists(\ZipArchive::class)) {
            $zip = new \ZipArchive();
            if ($zip->open($zipPath) === true) {
                $zip->extractTo($extractDir);
                $zip->close();
                return count(File::allFiles($extractDir)) > 0;
            }
        }

        $exitCode = 0;
        exec("unzip -o " . escapeshellarg($zipPath) . " -d " . escapeshellarg($extractDir) . " 2>&1", $output, $exitCode);
        if ($exitCode !== 0) {
            exec("python3 -c \"import zipfile; zipfile.ZipFile(" . escapeshellarg($zipPath) . ").extractall(" . escapeshellarg($extractDir) . ")\" 2>&1", $output, $exitCode);
        }

        return count(File::allFiles($extractDir)) > 0;
    }

    private function copyDirectory(string $source, string $dest, array $protectedPaths, int &$copied, int &$skipped, string $relativePath = ''): void
    {
        foreach (File::files($source) as $file) {
            $relPath = $relativePath ? $relativePath . '/' . $file->getFilename() : $file->getFilename();

            if ($this->isProtected($relPath, $protectedPaths)) {
                $skipped++;
                continue;
            }

            $destPath = $dest . '/' . $relPath;
            File::ensureDirectoryExists(dirname($destPath));
            File::copy($file->getPathname(), $destPath);
            $copied++;
        }

        foreach (File::directories($source) as $dir) {
            $dirName = basename($dir);
            $relPath = $relativePath ? $relativePath . '/' . $dirName : $dirName;

            if ($this->isProtected($relPath, $protectedPaths)) {
                $skipped++;
                continue;
            }

            $this->copyDirectory($dir, $dest, $protectedPaths, $copied, $skipped, $relPath);
        }
    }

    private function isProtected(string $path, array $protectedPaths): bool
    {
        foreach ($protectedPaths as $pp) {
            if ($path === $pp || str_starts_with($path, $pp . '/')) return true;
        }
        return false;
    }

    private function formatSize(int $bytes): string
    {
        if ($bytes < 1024) return $bytes . ' B';
        if ($bytes < 1048576) return round($bytes / 1024, 1) . ' KB';
        return round($bytes / 1048576, 1) . ' MB';
    }

    private function patchDistEnv(string $projectRoot): int
    {
        $envFile = $projectRoot . '/.env';
        if (!File::exists($envFile)) return 0;

        $serverVars = [];
        foreach (explode("\n", File::get($envFile)) as $line) {
            $line = trim($line);
            if (!$line || str_starts_with($line, '#') || !str_starts_with($line, 'VITE_')) continue;
            [$key, $value] = array_pad(explode('=', $line, 2), 2, '');
            $serverVars[trim($key)] = trim($value, " \t\n\r\0\x0B\"'");
        }

        if (empty($serverVars)) return 0;

        $distDir = $projectRoot . '/dist/assets';
        if (!is_dir($distDir)) return 0;

        $patched = 0;
        foreach (glob($distDir . '/*.js') as $jsFile) {
            $content = File::get($jsFile);
            $original = $content;

            if (!empty($serverVars['VITE_API_URL'])) {
                $value = $serverVars['VITE_API_URL'];
                foreach (['http://127.0.0.1:8000/api','http://localhost:8000/api','https://127.0.0.1:8000/api','https://localhost:8000/api','http://lojas.test/api','https://lojas.test/api'] as $dev) {
                    if ($dev !== $value) $content = str_replace($dev, $value, $content);
                }
            }

            if (!empty($serverVars['VITE_BASE_DOMAIN'])) {
                $value = $serverVars['VITE_BASE_DOMAIN'];
                foreach (['lojas.test','localhost','127.0.0.1'] as $dev) {
                    if ($dev !== $value) {
                        $content = str_replace('"' . $dev . '"', '"' . $value . '"', $content);
                        $content = str_replace("'" . $dev . "'", "'" . $value . "'", $content);
                    }
                }
            }

            if ($content !== $original) {
                File::put($jsFile, $content);
                $patched++;
            }
        }

        return $patched;
    }
}
