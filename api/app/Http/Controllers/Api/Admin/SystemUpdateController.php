<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;

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
