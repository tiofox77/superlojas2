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
    /**
     * Get update configuration (repo URL + current version).
     */
    public function config()
    {
        return response()->json([
            'github_repo' => Setting::get('github_repo', ''),
            'github_token' => Setting::get('github_token') ? '••••••••' : '',
            'has_token' => (bool) Setting::get('github_token'),
            'current_version' => Setting::get('current_version', '1.0.0'),
            'last_check' => Setting::get('last_update_check'),
            'auto_check' => Setting::get('auto_update_check', 'false') === 'true',
        ]);
    }

    /**
     * Save update configuration.
     */
    public function saveConfig(Request $request)
    {
        $request->validate([
            'github_repo' => 'required|string|max:500',
            'github_token' => 'nullable|string|max:500',
            'current_version' => 'nullable|string|max:50',
            'auto_check' => 'nullable|boolean',
        ]);

        // Normalize repo: accept full URL or owner/repo format
        $repo = $request->github_repo;
        $repo = preg_replace('#^https?://github\.com/#', '', $repo);
        $repo = rtrim($repo, '/');
        // Remove .git suffix
        $repo = preg_replace('#\.git$#', '', $repo);

        Setting::set('github_repo', $repo);

        if ($request->has('github_token') && $request->github_token && $request->github_token !== '••••••••') {
            Setting::set('github_token', $request->github_token);
        }

        if ($request->has('current_version') && $request->current_version) {
            Setting::set('current_version', $request->current_version);
        }

        if ($request->has('auto_check')) {
            Setting::set('auto_update_check', $request->auto_check ? 'true' : 'false');
        }

        // Clear cache so next check fetches fresh data
        Cache::forget('github_releases');

        return response()->json(['message' => 'Configuracao guardada com sucesso.']);
    }

    /**
     * Remove GitHub token.
     */
    public function removeToken()
    {
        Setting::where('key', 'github_token')->delete();
        return response()->json(['message' => 'Token removido.']);
    }

    /**
     * Fetch releases from GitHub API.
     */
    public function releases()
    {
        $repo = Setting::get('github_repo');
        if (!$repo) {
            return response()->json(['error' => 'Repositorio nao configurado.'], 422);
        }

        // Cache releases for 10 minutes
        $cacheKey = 'github_releases_' . md5($repo);
        $cached = Cache::get($cacheKey);

        if ($cached) {
            return response()->json([
                'releases' => $cached['releases'],
                'cached' => true,
                'current_version' => Setting::get('current_version', '1.0.0'),
            ]);
        }

        try {
            $headers = ['Accept' => 'application/vnd.github.v3+json', 'User-Agent' => 'SuperLojas-Updater'];
            $token = Setting::get('github_token');
            if ($token) {
                $headers['Authorization'] = 'Bearer ' . $token;
            }

            $response = Http::withHeaders($headers)
                ->timeout(15)
                ->get("https://api.github.com/repos/{$repo}/releases", ['per_page' => 20]);

            if ($response->failed()) {
                $status = $response->status();
                if ($status === 404) {
                    return response()->json(['error' => "Repositorio '{$repo}' nao encontrado."], 404);
                }
                if ($status === 403) {
                    return response()->json(['error' => 'Rate limit excedido ou token invalido. Adicione um token GitHub.'], 403);
                }
                if ($status === 401) {
                    return response()->json(['error' => 'Token GitHub invalido.'], 401);
                }
                return response()->json(['error' => "Erro GitHub API: HTTP {$status}"], $status);
            }

            $releases = collect($response->json())->map(function ($release) {
                return [
                    'id' => $release['id'],
                    'tag_name' => $release['tag_name'],
                    'name' => $release['name'] ?: $release['tag_name'],
                    'body' => $release['body'] ?? '',
                    'prerelease' => $release['prerelease'],
                    'draft' => $release['draft'],
                    'published_at' => $release['published_at'],
                    'html_url' => $release['html_url'],
                    'tarball_url' => $release['tarball_url'],
                    'zipball_url' => $release['zipball_url'],
                    'author' => [
                        'login' => $release['author']['login'] ?? '',
                        'avatar_url' => $release['author']['avatar_url'] ?? '',
                    ],
                    'assets' => collect($release['assets'] ?? [])->map(function ($asset) {
                        return [
                            'id' => $asset['id'],
                            'name' => $asset['name'],
                            'size' => $asset['size'],
                            'download_count' => $asset['download_count'],
                            'browser_download_url' => $asset['browser_download_url'],
                            'content_type' => $asset['content_type'],
                        ];
                    })->toArray(),
                ];
            })->filter(fn($r) => !$r['draft'])->values()->toArray();

            // Update last check timestamp
            Setting::set('last_update_check', now()->toIso8601String());

            // Cache for 10 minutes
            Cache::put($cacheKey, ['releases' => $releases], now()->addMinutes(10));

            return response()->json([
                'releases' => $releases,
                'cached' => false,
                'current_version' => Setting::get('current_version', '1.0.0'),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Erro de conexao: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Check for latest release only (lightweight check).
     */
    public function checkLatest()
    {
        $repo = Setting::get('github_repo');
        if (!$repo) {
            return response()->json(['has_update' => false, 'error' => 'Repositorio nao configurado.']);
        }

        try {
            $headers = ['Accept' => 'application/vnd.github.v3+json', 'User-Agent' => 'SuperLojas-Updater'];
            $token = Setting::get('github_token');
            if ($token) {
                $headers['Authorization'] = 'Bearer ' . $token;
            }

            $response = Http::withHeaders($headers)
                ->timeout(10)
                ->get("https://api.github.com/repos/{$repo}/releases/latest");

            if ($response->failed()) {
                return response()->json(['has_update' => false, 'error' => 'Erro ao verificar.']);
            }

            $latest = $response->json();
            $currentVersion = Setting::get('current_version', '1.0.0');
            $latestTag = ltrim($latest['tag_name'] ?? '', 'vV');
            $currentClean = ltrim($currentVersion, 'vV');

            Setting::set('last_update_check', now()->toIso8601String());

            return response()->json([
                'has_update' => version_compare($latestTag, $currentClean, '>'),
                'latest_version' => $latest['tag_name'],
                'current_version' => $currentVersion,
                'release_name' => $latest['name'] ?: $latest['tag_name'],
                'published_at' => $latest['published_at'],
                'html_url' => $latest['html_url'],
            ]);
        } catch (\Throwable $e) {
            return response()->json(['has_update' => false, 'error' => $e->getMessage()]);
        }
    }

    /**
     * Mark a specific version as the current installed version.
     */
    public function setVersion(Request $request)
    {
        $request->validate(['version' => 'required|string|max:50']);
        Setting::set('current_version', $request->version);
        Cache::forget('github_releases');

        return response()->json([
            'message' => "Versao actualizada para {$request->version}",
            'current_version' => $request->version,
        ]);
    }

    /**
     * Install a release directly on the server.
     * Downloads zip from GitHub, extracts, copies files (preserving .env, api/.env, api/storage/), runs migrations.
     */
    public function install(Request $request)
    {
        $request->validate([
            'tag' => 'required|string|max:100',
            'zipball_url' => 'required|string|url',
        ]);

        $tag = $request->tag;
        $zipUrl = $request->zipball_url;
        $repo = Setting::get('github_repo');

        if (!$repo) {
            return response()->json(['error' => 'Repositorio nao configurado.'], 422);
        }

        // Project root (one level up from api/)
        $projectRoot = realpath(base_path('..'));
        if (!$projectRoot || !is_dir($projectRoot)) {
            return response()->json(['error' => 'Nao foi possivel determinar a raiz do projecto.'], 500);
        }

        $steps = [];
        $tempDir = null;
        $zipPath = null;

        try {
            // ─── Step 1: Download zip ───
            $steps[] = ['step' => 'download', 'status' => 'running', 'message' => 'A descarregar release...'];

            $headers = ['User-Agent' => 'SuperLojas-Updater', 'Accept' => 'application/vnd.github.v3+json'];
            $token = Setting::get('github_token');
            if ($token) {
                $headers['Authorization'] = 'Bearer ' . $token;
            }

            $response = Http::withHeaders($headers)
                ->withOptions(['allow_redirects' => true])
                ->timeout(120)
                ->get($zipUrl);

            if ($response->failed()) {
                return response()->json([
                    'error' => 'Erro ao descarregar: HTTP ' . $response->status(),
                    'steps' => $steps,
                ], 500);
            }

            $zipContent = $response->body();
            if (strlen($zipContent) < 1000) {
                return response()->json(['error' => 'Ficheiro zip invalido ou vazio.', 'steps' => $steps], 500);
            }

            $tempDir = storage_path('app/update_' . uniqid());
            File::ensureDirectoryExists($tempDir);
            $zipPath = $tempDir . '/release.zip';
            File::put($zipPath, $zipContent);

            $steps[] = ['step' => 'download', 'status' => 'done', 'message' => 'Download concluido (' . $this->formatSize(strlen($zipContent)) . ')'];

            // ─── Step 2: Extract zip ───
            $steps[] = ['step' => 'extract', 'status' => 'running', 'message' => 'A extrair ficheiros...'];

            $extractDir = $tempDir . '/extracted';
            File::ensureDirectoryExists($extractDir);

            $extracted = false;

            // Try ZipArchive first
            if (class_exists(\ZipArchive::class)) {
                $zip = new \ZipArchive();
                if ($zip->open($zipPath) === true) {
                    $zip->extractTo($extractDir);
                    $zip->close();
                    $extracted = true;
                }
            }

            // Fallback: shell unzip command
            if (!$extracted) {
                $unzipCmd = "unzip -o " . escapeshellarg($zipPath) . " -d " . escapeshellarg($extractDir) . " 2>&1";
                $output = [];
                $exitCode = 0;
                exec($unzipCmd, $output, $exitCode);

                if ($exitCode !== 0) {
                    // Try Python as last resort
                    $pyCmd = "python3 -c \"import zipfile; zipfile.ZipFile(" . escapeshellarg($zipPath) . ").extractall(" . escapeshellarg($extractDir) . ")\" 2>&1";
                    exec($pyCmd, $output, $exitCode);
                }

                $extracted = ($exitCode === 0) || count(File::allFiles($extractDir)) > 0;
            }

            if (!$extracted || count(File::allFiles($extractDir)) === 0) {
                return response()->json([
                    'error' => 'Nao foi possivel extrair o zip. Verifique se a extensao php-zip ou o comando unzip estao disponiveis no servidor.',
                    'steps' => $steps,
                ], 500);
            }

            // GitHub zipball has a root folder like "owner-repo-hash/"
            $innerDirs = File::directories($extractDir);
            $sourceDir = count($innerDirs) === 1 ? $innerDirs[0] : $extractDir;

            if (!is_dir($sourceDir)) {
                return response()->json(['error' => 'Estrutura do zip invalida.', 'steps' => $steps], 500);
            }

            $steps[] = ['step' => 'extract', 'status' => 'done', 'message' => 'Extraccao concluida'];

            // ─── Step 3: Backup .env files ───
            $steps[] = ['step' => 'backup', 'status' => 'running', 'message' => 'A preservar ficheiros de configuracao...'];

            $preserved = [];

            // Save current .env files
            $envFiles = [
                $projectRoot . '/.env',
                $projectRoot . '/api/.env',
            ];
            $envBackups = [];
            foreach ($envFiles as $envFile) {
                if (File::exists($envFile)) {
                    $envBackups[$envFile] = File::get($envFile);
                    $preserved[] = str_replace($projectRoot . '/', '', $envFile);
                }
            }

            $steps[] = ['step' => 'backup', 'status' => 'done', 'message' => 'Ficheiros preservados: ' . implode(', ', $preserved)];

            // ─── Step 4: Copy files ───
            $steps[] = ['step' => 'copy', 'status' => 'running', 'message' => 'A copiar ficheiros novos...'];

            $copied = 0;
            $skipped = 0;

            // Files/dirs to NEVER overwrite from the release
            $protectedPaths = [
                '.env',
                'api/.env',
                'api/storage/app',
                'api/storage/logs',
                'api/storage/framework/sessions',
                'api/storage/framework/cache',
                'node_modules',
                'api/vendor',
            ];

            $this->copyDirectory($sourceDir, $projectRoot, $protectedPaths, $copied, $skipped);

            $steps[] = ['step' => 'copy', 'status' => 'done', 'message' => "{$copied} ficheiros copiados, {$skipped} protegidos/ignorados"];

            // ─── Step 5: Restore .env files (safety) ───
            foreach ($envBackups as $envFile => $content) {
                File::put($envFile, $content);
            }

            // ─── Step 6: Run migrations ───
            $steps[] = ['step' => 'migrate', 'status' => 'running', 'message' => 'A executar migracoes...'];

            $migrateOutput = '';
            try {
                Artisan::call('migrate', ['--force' => true]);
                $migrateOutput = trim(Artisan::output());
            } catch (\Throwable $e) {
                $migrateOutput = 'Erro: ' . $e->getMessage();
                Log::error('Update migration error', ['error' => $e->getMessage()]);
            }

            $steps[] = ['step' => 'migrate', 'status' => 'done', 'message' => $migrateOutput ?: 'Sem migracoes pendentes'];

            // ─── Step 6b: Run seeders (idempotent only) ───
            $steps[] = ['step' => 'seed', 'status' => 'running', 'message' => 'A executar seeders...'];

            $seedOutput = '';
            try {
                Artisan::call('db:seed', ['--class' => 'Database\\Seeders\\UpdateSeeder', '--force' => true]);
                $seedOutput = trim(Artisan::output());
            } catch (\Throwable $e) {
                $seedOutput = 'Erro: ' . $e->getMessage();
                Log::error('Update seeder error', ['error' => $e->getMessage()]);
            }

            $steps[] = ['step' => 'seed', 'status' => 'done', 'message' => $seedOutput ?: 'Seeders executados'];

            // ─── Step 7: Clear caches ───
            $steps[] = ['step' => 'cache', 'status' => 'running', 'message' => 'A limpar caches...'];

            try {
                Artisan::call('config:clear');
                Artisan::call('route:clear');
                Artisan::call('view:clear');
                Artisan::call('cache:clear');
            } catch (\Throwable $e) {
                Log::warning('Cache clear error during update', ['error' => $e->getMessage()]);
            }

            $steps[] = ['step' => 'cache', 'status' => 'done', 'message' => 'Caches limpos'];

            // ─── Step 8: Update version ───
            $cleanTag = ltrim($tag, 'vV');
            Setting::set('current_version', $cleanTag);
            Cache::forget('github_releases');
            Setting::set('last_update_installed', now()->toIso8601String());

            $steps[] = ['step' => 'version', 'status' => 'done', 'message' => "Versao actualizada para {$cleanTag}"];

            // ─── Cleanup temp ───
            File::deleteDirectory($tempDir);

            Log::info("System updated to {$tag}", [
                'repo' => $repo,
                'files_copied' => $copied,
                'files_skipped' => $skipped,
            ]);

            return response()->json([
                'message' => "Actualizacao para {$tag} instalada com sucesso!",
                'version' => $cleanTag,
                'steps' => $steps,
                'files_copied' => $copied,
                'files_skipped' => $skipped,
            ]);

        } catch (\Throwable $e) {
            // Cleanup on error
            if ($tempDir && File::isDirectory($tempDir)) {
                File::deleteDirectory($tempDir);
            }

            // Restore .env if we backed them up
            if (!empty($envBackups)) {
                foreach ($envBackups as $envFile => $content) {
                    File::put($envFile, $content);
                }
            }

            Log::error("System update failed", ['error' => $e->getMessage(), 'tag' => $tag]);

            return response()->json([
                'error' => 'Erro na instalacao: ' . $e->getMessage(),
                'steps' => $steps,
            ], 500);
        }
    }

    /**
     * Recursively copy directory, respecting protected paths.
     */
    private function copyDirectory(string $source, string $dest, array $protectedPaths, int &$copied, int &$skipped, string $relativePath = ''): void
    {
        $items = File::files($source);
        foreach ($items as $file) {
            $relPath = $relativePath ? $relativePath . '/' . $file->getFilename() : $file->getFilename();

            // Check if protected
            $isProtected = false;
            foreach ($protectedPaths as $pp) {
                if ($relPath === $pp || str_starts_with($relPath, $pp . '/')) {
                    $isProtected = true;
                    break;
                }
            }

            if ($isProtected) {
                $skipped++;
                continue;
            }

            $destPath = $dest . '/' . $relPath;
            File::ensureDirectoryExists(dirname($destPath));
            File::copy($file->getPathname(), $destPath);
            $copied++;
        }

        $dirs = File::directories($source);
        foreach ($dirs as $dir) {
            $dirName = basename($dir);
            $relPath = $relativePath ? $relativePath . '/' . $dirName : $dirName;

            // Skip fully protected directories
            $isProtected = false;
            foreach ($protectedPaths as $pp) {
                if ($relPath === $pp) {
                    $isProtected = true;
                    break;
                }
            }

            if ($isProtected) {
                $skipped++;
                continue;
            }

            $this->copyDirectory($dir, $dest, $protectedPaths, $copied, $skipped, $relPath);
        }
    }

    private function formatSize(int $bytes): string
    {
        if ($bytes < 1024) return $bytes . ' B';
        if ($bytes < 1048576) return round($bytes / 1024, 1) . ' KB';
        return round($bytes / 1048576, 1) . ' MB';
    }

    /**
     * Get repository info (stars, forks, etc.)
     */
    public function repoInfo()
    {
        $repo = Setting::get('github_repo');
        if (!$repo) {
            return response()->json(['error' => 'Repositorio nao configurado.'], 422);
        }

        try {
            $headers = ['Accept' => 'application/vnd.github.v3+json', 'User-Agent' => 'SuperLojas-Updater'];
            $token = Setting::get('github_token');
            if ($token) {
                $headers['Authorization'] = 'Bearer ' . $token;
            }

            $response = Http::withHeaders($headers)
                ->timeout(10)
                ->get("https://api.github.com/repos/{$repo}");

            if ($response->failed()) {
                return response()->json(['error' => 'Repositorio nao encontrado.'], 404);
            }

            $data = $response->json();

            return response()->json([
                'full_name' => $data['full_name'],
                'description' => $data['description'],
                'html_url' => $data['html_url'],
                'default_branch' => $data['default_branch'],
                'stars' => $data['stargazers_count'],
                'forks' => $data['forks_count'],
                'open_issues' => $data['open_issues_count'],
                'language' => $data['language'],
                'updated_at' => $data['updated_at'],
                'private' => $data['private'],
                'owner' => [
                    'login' => $data['owner']['login'],
                    'avatar_url' => $data['owner']['avatar_url'],
                ],
            ]);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
