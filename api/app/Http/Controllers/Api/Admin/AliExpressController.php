<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\ImportJob;
use App\Models\Setting;
use App\Models\SupplierOrder;
use App\Services\AiService;
use App\Services\AliExpressService;
use Illuminate\Http\Request;

class AliExpressController extends Controller
{
    /**
     * Integration status — used by the admin UI to show what's wired.
     */
    public function status(AliExpressService $ae, AiService $ai)
    {
        return response()->json([
            'aliexpress_configured' => $ae->isConfigured(),
            'ai_configured' => $ai->isConfigured(),
            'ship_to' => Setting::get('aliexpress_ship_to', config('services.aliexpress.ship_to', 'AO')),
            'currency' => Setting::get('aliexpress_currency', config('services.aliexpress.currency', 'USD')),
            'ai_model' => Setting::get('ai_model', config('services.ai.model', 'gpt-4o-mini')),
        ]);
    }

    /**
     * Read the integration credentials/config (secrets masked) for the UI form.
     */
    public function config()
    {
        $mask = fn (?string $v) => $v ? '••••••' . mb_substr($v, -4) : null;

        return response()->json([
            'aliexpress' => [
                'app_key' => Setting::get('aliexpress_app_key'),
                'app_secret_set' => (bool) Setting::get('aliexpress_app_secret'),
                'app_secret_preview' => $mask(Setting::get('aliexpress_app_secret')),
                'access_token_set' => (bool) Setting::get('aliexpress_access_token'),
                'ship_to' => Setting::get('aliexpress_ship_to', 'AO'),
                'currency' => Setting::get('aliexpress_currency', 'USD'),
                'scrape_enabled' => filter_var(Setting::get('aliexpress_scrape_enabled', true), FILTER_VALIDATE_BOOL),
                'usd_to_aoa' => (float) Setting::get('aliexpress_usd_to_aoa', 0),
                'margin_pct' => (float) Setting::get('aliexpress_margin_pct', 0),
            ],
            'ai' => [
                'base_url' => Setting::get('ai_base_url'),
                'api_key_set' => (bool) Setting::get('ai_api_key'),
                'api_key_preview' => $mask(Setting::get('ai_api_key')),
                'model' => Setting::get('ai_model', 'gpt-4o-mini'),
            ],
            'hermes' => [
                'webhook_url' => Setting::get('hermes_webhook_url'),
                'webhook_secret_set' => (bool) Setting::get('hermes_webhook_secret'),
            ],
        ]);
    }

    /**
     * Save the integration credentials/config to the database.
     * Secret fields are only overwritten when a non-empty value is sent, so the
     * UI can leave them blank to keep the current value.
     */
    public function saveConfig(Request $request)
    {
        $data = $request->validate([
            'aliexpress_app_key' => 'sometimes|nullable|string|max:255',
            'aliexpress_app_secret' => 'sometimes|nullable|string|max:255',
            'aliexpress_access_token' => 'sometimes|nullable|string|max:512',
            'aliexpress_ship_to' => 'sometimes|nullable|string|max:8',
            'aliexpress_currency' => 'sometimes|nullable|string|max:8',
            'aliexpress_scrape_enabled' => 'sometimes|boolean',
            'aliexpress_usd_to_aoa' => 'sometimes|nullable|numeric|min:0',
            'aliexpress_margin_pct' => 'sometimes|nullable|numeric|min:0',
            'ai_base_url' => 'sometimes|nullable|string|max:255',
            'ai_api_key' => 'sometimes|nullable|string|max:255',
            'ai_model' => 'sometimes|nullable|string|max:120',
            'hermes_webhook_url' => 'sometimes|nullable|url|max:500',
            'hermes_webhook_secret' => 'sometimes|nullable|string|max:255',
        ]);

        // Non-secret fields: always set when present.
        foreach (['aliexpress_app_key', 'aliexpress_ship_to', 'aliexpress_currency', 'aliexpress_usd_to_aoa', 'aliexpress_margin_pct', 'ai_base_url', 'ai_model', 'hermes_webhook_url'] as $k) {
            if (array_key_exists($k, $data)) {
                Setting::set($k, $data[$k] ?? '');
            }
        }
        if (array_key_exists('aliexpress_scrape_enabled', $data)) {
            Setting::set('aliexpress_scrape_enabled', $data['aliexpress_scrape_enabled'] ? '1' : '0');
        }

        // Secret fields: only overwrite when a non-empty value is provided.
        foreach (['aliexpress_app_secret', 'aliexpress_access_token', 'ai_api_key', 'hermes_webhook_secret'] as $k) {
            if (!empty($data[$k])) {
                Setting::set($k, $data[$k]);
            }
        }

        return response()->json(['message' => 'Configuracoes guardadas com sucesso.']);
    }

    /**
     * Preview a product from an AliExpress URL/id (import + optional AI enrich).
     * Returns a draft without creating anything.
     */
    public function preview(Request $request, AliExpressService $ae, AiService $ai)
    {
        $data = $request->validate([
            'url' => 'required|string|max:1000',
            'enrich' => 'sometimes|boolean',
        ]);

        $result = $ae->importProduct($data['url']);
        if (!($result['ok'] ?? false)) {
            return response()->json(['error' => $result['error'] ?? 'Falha na importacao.'], 422);
        }

        $draft = $result['draft'];
        $aiApplied = false;
        $aiError = null;

        if (($data['enrich'] ?? true) && $ai->isConfigured()) {
            $categories = Category::with('subcategories:id,category_id,name,slug')
                ->select('id', 'name', 'slug')->orderBy('name')->get()->toArray();
            $enriched = $ai->enrichProduct($draft, $categories);
            if ($enriched['ok']) {
                foreach (['name', 'description', 'category_id', 'subcategory_id', 'meta_title', 'meta_description'] as $f) {
                    if (array_key_exists($f, $enriched['data']) && $enriched['data'][$f] !== null && $enriched['data'][$f] !== '') {
                        $draft[$f] = $enriched['data'][$f];
                    }
                }
                $aiApplied = true;
            } else {
                $aiError = $enriched['error'] ?? null;
            }
        }

        return response()->json([
            'ok' => true,
            'needs_aliexpress_keys' => $result['needs_keys'] ?? false,
            'ai_applied' => $aiApplied,
            'ai_error' => $aiError,
            'draft' => $draft,
        ]);
    }

    // ─── Import job queue (enviar URL para o Hermes) ──────────────

    /**
     * Enqueue one or more AliExpress URLs for the Hermes agent to process.
     * This is how SuperLojas "sends" a URL to Hermes (it polls the queue).
     */
    public function enqueueImportJob(Request $request)
    {
        $data = $request->validate([
            'store_id' => 'required|integer|exists:stores,id',
            'urls' => 'required_without:url|array',
            'urls.*' => 'string|max:1000',
            'url' => 'required_without:urls|string|max:1000',
        ]);

        $store = \App\Models\Store::find($data['store_id']);
        $urls = $data['urls'] ?? [$data['url']];
        $created = [];
        foreach ($urls as $url) {
            $url = trim($url);
            if ($url === '') continue;
            $job = ImportJob::create([
                'store_id' => $data['store_id'],
                'url' => $url,
                'status' => 'pending',
                'created_by' => $request->user()->id,
            ]);
            $created[] = $job;
            // Push (webhook) to Hermes if configured — otherwise Hermes polls.
            $this->notifyHermes($job, $store);
        }

        return response()->json([
            'message' => count($created) . ' URL(s) enviada(s) para a fila do Hermes.',
            'webhook' => (bool) Setting::get('hermes_webhook_url'),
            'jobs' => $created,
        ], 201);
    }

    /**
     * Push a signed webhook to Hermes announcing a new job. Best-effort:
     * failures are logged, never block enqueuing (Hermes can still poll).
     */
    private function notifyHermes(ImportJob $job, $store): void
    {
        $url = Setting::get('hermes_webhook_url');
        if (!$url || !$store) {
            return;
        }
        $secret = (string) Setting::get('hermes_webhook_secret', '');

        $payload = [
            'event' => 'import_job.created',
            'job_id' => $job->id,
            'store_slug' => $store->slug,
            'url' => $job->url,
            'spec_url' => url("/api/store-api/{$store->slug}/products/hermes-spec"),
            'complete_url' => url("/api/store-api/{$store->slug}/products/import-jobs/{$job->id}/complete"),
            'fail_url' => url("/api/store-api/{$store->slug}/products/import-jobs/{$job->id}/fail"),
            'timestamp' => now()->toIso8601String(),
        ];
        $body = json_encode($payload);
        $sig = hash_hmac('sha256', $body, $secret);

        try {
            \Illuminate\Support\Facades\Http::timeout(8)
                ->withHeaders(['X-SuperLojas-Signature' => 'sha256=' . $sig])
                ->withBody($body, 'application/json')
                ->post($url);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Hermes webhook failed: ' . $e->getMessage());
        }
    }

    /**
     * Send a test webhook to the configured Hermes URL and return the result.
     */
    public function webhookTest()
    {
        $url = Setting::get('hermes_webhook_url');
        if (!$url) {
            return response()->json(['ok' => false, 'error' => 'Nenhum webhook configurado.'], 422);
        }
        $secret = (string) Setting::get('hermes_webhook_secret', '');
        $body = json_encode(['event' => 'ping', 'timestamp' => now()->toIso8601String()]);
        $sig = hash_hmac('sha256', $body, $secret);

        try {
            $res = \Illuminate\Support\Facades\Http::timeout(10)
                ->withHeaders(['X-SuperLojas-Signature' => 'sha256=' . $sig])
                ->withBody($body, 'application/json')
                ->post($url);
            return response()->json(['ok' => $res->successful(), 'status' => $res->status(), 'body' => mb_substr($res->body(), 0, 500)]);
        } catch (\Throwable $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()], 502);
        }
    }

    public function importJobs(Request $request)
    {
        $query = ImportJob::with(['store:id,name,slug', 'product:id,name,slug'])
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('store_id')) {
            $query->where('store_id', $request->store_id);
        }

        return response()->json($query->paginate(min((int) $request->get('per_page', 25), 100)));
    }

    public function deleteImportJob(ImportJob $importJob)
    {
        $importJob->delete();
        return response()->json(['message' => 'Job removido.']);
    }

    // ─── Supplier orders (nossas encomendas no AliExpress) ────────

    public function index(Request $request)
    {
        $query = SupplierOrder::with(['order:id,order_number,customer_name,total', 'store:id,name,slug'])
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('store_id')) {
            $query->where('store_id', $request->store_id);
        }
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('ae_order_id', 'like', "%{$s}%")
                    ->orWhere('tracking_number', 'like', "%{$s}%");
            });
        }

        return response()->json($query->paginate(min((int) $request->get('per_page', 25), 100)));
    }

    public function show(SupplierOrder $supplierOrder)
    {
        return response()->json($supplierOrder->load(['order.items', 'store:id,name,slug']));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'order_id' => 'nullable|integer|exists:orders,id',
            'store_id' => 'nullable|integer|exists:stores,id',
            'ae_order_id' => 'nullable|string|max:64',
            'status' => 'nullable|in:draft,placed,shipped,delivered,cancelled',
            'tracking_number' => 'nullable|string|max:128',
            'carrier' => 'nullable|string|max:64',
            'cost' => 'nullable|numeric|min:0',
            'cost_currency' => 'nullable|string|max:8',
            'sale_total' => 'nullable|numeric|min:0',
            'sale_currency' => 'nullable|string|max:8',
            'notes' => 'nullable|string',
        ]);
        $data['supplier'] = 'aliexpress';
        if (($data['status'] ?? 'draft') === 'placed' && empty($data['placed_at'])) {
            $data['placed_at'] = now();
        }

        $supplierOrder = SupplierOrder::create($data);
        return response()->json($supplierOrder, 201);
    }

    public function update(Request $request, SupplierOrder $supplierOrder)
    {
        $data = $request->validate([
            'ae_order_id' => 'sometimes|nullable|string|max:64',
            'status' => 'sometimes|in:draft,placed,shipped,delivered,cancelled',
            'tracking_number' => 'sometimes|nullable|string|max:128',
            'carrier' => 'sometimes|nullable|string|max:64',
            'cost' => 'sometimes|nullable|numeric|min:0',
            'cost_currency' => 'sometimes|nullable|string|max:8',
            'sale_total' => 'sometimes|nullable|numeric|min:0',
            'sale_currency' => 'sometimes|nullable|string|max:8',
            'notes' => 'sometimes|nullable|string',
        ]);

        if (isset($data['status']) && $data['status'] === 'placed' && !$supplierOrder->placed_at) {
            $data['placed_at'] = now();
        }

        $supplierOrder->update($data);
        return response()->json($supplierOrder->fresh());
    }

    public function destroy(SupplierOrder $supplierOrder)
    {
        $supplierOrder->delete();
        return response()->json(['message' => 'Encomenda de fornecedor removida.']);
    }
}
