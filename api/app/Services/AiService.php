<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Provider-agnostic AI client (OpenAI-compatible /chat/completions).
 * Credentials are read from the database (Settings, managed in the admin panel)
 * with a fallback to config/.env. Compatible with "aisa one" or any
 * OpenAI-style endpoint.
 */
class AiService
{
    private ?string $baseUrl;
    private ?string $apiKey;
    private string $model;
    private int $timeout;

    public function __construct()
    {
        $base = self::setting('ai_base_url', config('services.ai.base_url'));
        $this->baseUrl = $base ? rtrim((string) $base, '/') : null;
        $this->apiKey = self::setting('ai_api_key', config('services.ai.api_key'));
        $this->model = self::setting('ai_model', config('services.ai.model', 'gpt-4o-mini')) ?: 'gpt-4o-mini';
        $this->timeout = (int) self::setting('ai_timeout', config('services.ai.timeout', 30));
    }

    /**
     * Read a setting from the DB, falling back to config/.env. '' == unset.
     */
    private static function setting(string $key, $default = null)
    {
        try {
            $v = Setting::get($key);
        } catch (\Throwable $e) {
            $v = null;
        }
        return ($v === null || $v === '') ? $default : $v;
    }

    public function isConfigured(): bool
    {
        return !empty($this->baseUrl) && !empty($this->apiKey);
    }

    /**
     * Enrich an imported product draft: translate/clean into Angolan Portuguese,
     * pick a category, and generate SEO. $categories is the /categories payload.
     *
     * @return array{ok:bool, error?:string, data?:array}
     */
    public function enrichProduct(array $draft, array $categories = []): array
    {
        if (!$this->isConfigured()) {
            return ['ok' => false, 'error' => 'IA nao configurada (falta AI_BASE_URL/AI_API_KEY).'];
        }

        // Compact category list for the prompt
        $catLines = [];
        foreach ($categories as $c) {
            $subs = collect($c['subcategories'] ?? [])
                ->map(fn ($s) => "{$s['id']}:{$s['name']}")->implode(', ');
            $catLines[] = "cat {$c['id']} = {$c['name']}" . ($subs ? " (subs: {$subs})" : '');
        }
        $catBlock = implode("\n", $catLines) ?: '(sem categorias fornecidas)';

        $system = "Es um assistente de e-commerce para um marketplace de Angola. "
            . "Respondes SEMPRE em portugues de Angola. Devolves APENAS JSON valido, sem texto extra.";

        $user = "Produto importado do AliExpress (pode estar em ingles/chines):\n"
            . 'NOME: ' . ($draft['name'] ?? '(vazio)') . "\n"
            . 'DESCRICAO: ' . mb_substr((string) ($draft['description'] ?? ''), 0, 4000) . "\n\n"
            . "Categorias disponiveis (usa o ID exato, nunca inventes):\n{$catBlock}\n\n"
            . "Tarefa: devolve um JSON com os campos:\n"
            . "{\n"
            . '  "name": "titulo curto e claro em portugues (max 100 chars)",' . "\n"
            . '  "description": "descricao vendedora em portugues de Angola, 2-4 paragrafos, sem HTML",' . "\n"
            . '  "category_id": <id numerico da categoria mais adequada ou null>,' . "\n"
            . '  "subcategory_id": <id da subcategoria ou null>,' . "\n"
            . '  "meta_title": "titulo SEO (max 60 chars)",' . "\n"
            . '  "meta_description": "meta descricao SEO (max 155 chars)"' . "\n"
            . "}";

        try {
            $content = $this->chat([
                ['role' => 'system', 'content' => $system],
                ['role' => 'user', 'content' => $user],
            ]);
        } catch (\Throwable $e) {
            Log::warning('AiService enrichProduct failed: ' . $e->getMessage());
            return ['ok' => false, 'error' => 'Falha na IA: ' . $e->getMessage()];
        }

        $data = $this->extractJson($content);
        if ($data === null) {
            return ['ok' => false, 'error' => 'A IA nao devolveu JSON valido.', 'raw' => $content];
        }

        return ['ok' => true, 'data' => $data];
    }

    /**
     * Low-level chat call. Returns the assistant message content string.
     */
    public function chat(array $messages, array $opts = []): string
    {
        if (!$this->isConfigured()) {
            throw new \RuntimeException('IA nao configurada.');
        }

        $response = Http::timeout($this->timeout)
            ->withToken($this->apiKey)
            ->acceptJson()
            ->post($this->baseUrl . '/chat/completions', array_merge([
                'model' => $this->model,
                'messages' => $messages,
                'temperature' => 0.4,
            ], $opts));

        if (!$response->successful()) {
            throw new \RuntimeException('HTTP ' . $response->status() . ': ' . $response->body());
        }

        $content = data_get($response->json(), 'choices.0.message.content');
        if (!is_string($content) || $content === '') {
            throw new \RuntimeException('Resposta da IA vazia.');
        }
        return $content;
    }

    /**
     * Best-effort extraction of a JSON object from the model output
     * (handles code fences and surrounding prose).
     */
    private function extractJson(string $text): ?array
    {
        $text = trim($text);
        // Strip ```json ... ``` fences
        if (preg_match('/```(?:json)?\s*(.+?)\s*```/s', $text, $m)) {
            $text = $m[1];
        }
        // Grab the outermost {...}
        $start = strpos($text, '{');
        $end = strrpos($text, '}');
        if ($start === false || $end === false || $end < $start) {
            return null;
        }
        $json = substr($text, $start, $end - $start + 1);
        $decoded = json_decode($json, true);
        return is_array($decoded) ? $decoded : null;
    }
}
