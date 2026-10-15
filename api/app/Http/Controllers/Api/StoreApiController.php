<?php

namespace App\Http\Controllers\Api;

use App\Helpers\SeoFileName;
use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use App\Models\Store;
use App\Services\AiService;
use App\Services\AliExpressService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class StoreApiController extends Controller
{
    private function store(Request $request): Store
    {
        return $request->attributes->get('api_store');
    }

    private function checkPermission(Request $request, string $perm): bool
    {
        $store = $this->store($request);
        $permissions = $store->api_permissions ?? ['read', 'write', 'delete'];
        return in_array($perm, $permissions);
    }

    // ─── Store Info ───────────────────────────────────────────────

    public function info(Request $request)
    {
        $store = $this->store($request);
        return response()->json([
            'id' => $store->id,
            'name' => $store->name,
            'slug' => $store->slug,
            'description' => $store->description,
            'logo' => $store->logo,
            'banner' => $store->banner,
            'province' => $store->province,
            'city' => $store->city,
            'whatsapp' => $store->whatsapp,
            'email' => $store->email,
            'phone' => $store->phone,
            'rating' => $store->rating,
            'review_count' => $store->review_count,
            'status' => $store->status,
            'plan' => $store->plan ? ['name' => $store->plan->name, 'slug' => $store->plan->slug] : null,
            'products_count' => $store->products()->count(),
        ]);
    }

    // ─── Products: List ───────────────────────────────────────────

    public function products(Request $request)
    {
        if (!$this->checkPermission($request, 'read')) {
            return response()->json(['error' => 'Sem permissao de leitura.'], 403);
        }

        $store = $this->store($request);
        $query = $store->products();

        // Filters
        if ($request->has('category')) {
            $query->where('category', $request->category);
        }
        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }
        if ($request->has('badge')) {
            $query->where('badge', $request->badge);
        }
        if ($request->has('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }
        if ($request->has('in_stock')) {
            $query->where('stock', '>', 0);
        }

        // Sort
        $sortField = $request->get('sort', 'created_at');
        $sortDir = $request->get('order', 'desc');
        $allowed = ['name', 'price', 'stock', 'created_at', 'updated_at'];
        if (in_array($sortField, $allowed)) {
            $query->orderBy($sortField, $sortDir === 'asc' ? 'asc' : 'desc');
        }

        // Pagination
        $perPage = min((int) $request->get('per_page', 25), 100);

        return response()->json($query->paginate($perPage));
    }

    // ─── Products: Show single ────────────────────────────────────

    public function productShow(Request $request, $slug, $productId)
    {
        if (!$this->checkPermission($request, 'read')) {
            return response()->json(['error' => 'Sem permissao de leitura.'], 403);
        }

        $store = $this->store($request);
        $product = $store->products()->findOrFail($productId);

        return response()->json($product);
    }

    // ─── Products: Create ─────────────────────────────────────────

    public function productStore(Request $request)
    {
        if (!$this->checkPermission($request, 'write')) {
            return response()->json(['error' => 'Sem permissao de escrita.'], 403);
        }

        $store = $this->store($request);

        // Check plan product limit
        $plan = $store->plan;
        if ($plan && $plan->max_products > 0) {
            $currentCount = $store->products()->count();
            if ($currentCount >= $plan->max_products) {
                return response()->json([
                    'error' => "Limite de produtos atingido ({$plan->max_products}). Faca upgrade do plano.",
                    'current' => $currentCount,
                    'limit' => $plan->max_products,
                ], 422);
            }
        }

        // Images can be sent EITHER as uploaded files (multipart, images[])
        // OR as an array of URL strings (JSON). Detect which and validate.
        $isUpload = $request->hasFile('images');

        $rules = [
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'original_price' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'category' => 'nullable|string',
            'category_id' => 'nullable|integer|exists:categories,id',
            'subcategory_id' => 'nullable|integer|exists:subcategories,id',
            'stock' => 'sometimes|integer|min:0',
            'badge' => 'nullable|in:Novo,Promo',
            'images' => 'nullable|array',
            'images.*' => $isUpload ? 'file|image|max:10240' : 'string',
        ];
        $data = $request->validate($rules);

        // Enforce plan image limit for uploads
        if ($isUpload) {
            $maxImages = $plan ? $plan->max_images_per_product : 5;
            if ($maxImages > 0 && count($request->file('images')) > $maxImages) {
                return response()->json([
                    'error' => "O seu plano permite no maximo {$maxImages} imagem(ns) por produto.",
                    'limit' => $maxImages,
                ], 422);
            }
        }

        $imageInput = $data['images'] ?? [];
        unset($data['images']);

        $data['store_id'] = $store->id;
        $data['slug'] = Str::slug($data['name']);
        $data['stock'] = $data['stock'] ?? 0;

        // Ensure slug uniqueness
        $base = $data['slug'];
        $i = 1;
        while (Product::where('slug', $data['slug'])->exists()) {
            $data['slug'] = $base . '-' . $i++;
        }

        // Resolve images: store uploaded files, or keep URL strings as-is
        if ($isUpload) {
            $paths = [];
            foreach ($request->file('images') as $idx => $image) {
                $paths[] = SeoFileName::storePublic($image, "stores/{$store->id}/products", $data['slug'], (string) ($idx + 1));
            }
            $data['images'] = $paths;
        } else {
            $data['images'] = $imageInput;
        }

        $product = Product::create($data);

        return response()->json($product, 201);
    }

    // ─── Products: Update ─────────────────────────────────────────

    public function productUpdate(Request $request, $slug, $productId)
    {
        if (!$this->checkPermission($request, 'write')) {
            return response()->json(['error' => 'Sem permissao de escrita.'], 403);
        }

        $store = $this->store($request);
        $product = $store->products()->findOrFail($productId);

        // Images: uploaded files (multipart) replace the set; or URL strings (JSON).
        $isUpload = $request->hasFile('images');

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'price' => 'sometimes|numeric|min:0',
            'original_price' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'category' => 'nullable|string',
            'category_id' => 'nullable|integer|exists:categories,id',
            'subcategory_id' => 'nullable|integer|exists:subcategories,id',
            'stock' => 'sometimes|integer|min:0',
            'badge' => 'nullable|in:Novo,Promo',
            'images' => 'nullable|array',
            'images.*' => $isUpload ? 'file|image|max:10240' : 'string',
        ]);

        if (isset($data['name']) && $data['name'] !== $product->name) {
            $data['slug'] = Str::slug($data['name']);
            $base = $data['slug'];
            $i = 1;
            while (Product::where('slug', $data['slug'])->where('id', '!=', $product->id)->exists()) {
                $data['slug'] = $base . '-' . $i++;
            }
        }

        // Handle uploaded image files (replaces the image set)
        if ($isUpload) {
            $plan = $store->plan;
            $maxImages = $plan ? $plan->max_images_per_product : 5;
            if ($maxImages > 0 && count($request->file('images')) > $maxImages) {
                return response()->json([
                    'error' => "O seu plano permite no maximo {$maxImages} imagem(ns) por produto.",
                    'limit' => $maxImages,
                ], 422);
            }
            $slugForFile = $data['slug'] ?? $product->slug;
            $paths = [];
            foreach ($request->file('images') as $idx => $image) {
                $paths[] = SeoFileName::storePublic($image, "stores/{$store->id}/products", $slugForFile, (string) ($idx + 1));
            }
            $data['images'] = $paths;
        }

        $product->update($data);

        return response()->json($product);
    }

    // ─── Products: Delete ─────────────────────────────────────────

    public function productDestroy(Request $request, $slug, $productId)
    {
        if (!$this->checkPermission($request, 'delete')) {
            return response()->json(['error' => 'Sem permissao de eliminacao.'], 403);
        }

        $store = $this->store($request);
        $product = $store->products()->findOrFail($productId);
        $product->delete();

        return response()->json(['message' => 'Produto eliminado com sucesso.']);
    }

    // ─── Import from AliExpress (+ optional AI enrichment) ────────

    /**
     * Paste an AliExpress URL or product id and get back a normalized draft
     * (name, description, images, price, suggested category). Does NOT create
     * the product — the caller reviews the draft then POSTs to /products.
     */
    public function importAliexpress(Request $request, AliExpressService $ae, AiService $ai)
    {
        if (!$this->checkPermission($request, 'write')) {
            return response()->json(['error' => 'Sem permissao de escrita.'], 403);
        }

        $data = $request->validate([
            'url' => 'required|string|max:1000',
            'enrich' => 'sometimes|boolean', // run AI translation/categorization (default true)
        ]);

        $result = $ae->importProduct($data['url']);
        if (!($result['ok'] ?? false)) {
            return response()->json(['error' => $result['error'] ?? 'Falha na importacao.'], 422);
        }

        $draft = $result['draft'];
        $enrich = $data['enrich'] ?? true;
        $aiApplied = false;
        $aiError = null;

        if ($enrich && $ai->isConfigured()) {
            $categories = Category::with('subcategories:id,category_id,name,slug')
                ->select('id', 'name', 'slug')->orderBy('name')->get()->toArray();

            $enriched = $ai->enrichProduct($draft, $categories);
            if ($enriched['ok']) {
                $d = $enriched['data'];
                // Only override fields the AI actually produced
                foreach (['name', 'description', 'category_id', 'subcategory_id', 'meta_title', 'meta_description'] as $f) {
                    if (array_key_exists($f, $d) && $d[$f] !== null && $d[$f] !== '') {
                        $draft[$f] = $d[$f];
                    }
                }
                $aiApplied = true;
            } else {
                $aiError = $enriched['error'] ?? 'Falha na IA.';
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

    /**
     * Hermes bridge: the agent opens the AliExpress page in a real browser,
     * gathers the info (title, description, images, price, variants) and posts
     * it here. We normalize + optionally AI-enrich, then return a draft or
     * create the product directly (create=true, requires a sale price).
     */
    public function fromHermes(Request $request, AiService $ai, AliExpressService $ae)
    {
        if (!$this->checkPermission($request, 'write')) {
            return response()->json(['error' => 'Sem permissao de escrita.'], 403);
        }

        $data = $request->validate($this->hermesRules());
        $store = $this->store($request);
        $r = $this->buildFromHermes($data, $ai, $ae, $store, $data['create'] ?? false);

        return response()->json([
            'ok' => true,
            'created' => (bool) $r['created'],
            'ai_applied' => $r['aiApplied'],
            'ai_error' => $r['aiError'],
            'draft' => $r['draft'],
            'product' => $r['created'],
            'note' => $r['note'],
        ]);
    }

    /** Validation rules shared by the Hermes bridge and the import-job queue. */
    private function hermesRules(): array
    {
        return [
            'url' => 'nullable|string|max:1000',
            'ae_product_id' => 'nullable|string|max:64',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'images' => 'nullable|array',
            'images.*' => 'string',
            'price' => 'nullable|numeric|min:0',       // sale price in AOA
            'ae_cost' => 'nullable|numeric|min:0',     // supplier cost (USD)
            'ae_currency' => 'nullable|string|max:8',
            'variants' => 'nullable|array',
            'enrich' => 'sometimes|boolean',
            'create' => 'sometimes|boolean',
            'stock' => 'sometimes|integer|min:0',
        ];
    }

    /**
     * Shared pipeline: normalize the Hermes-provided fields, optionally enrich
     * with AI (translate + categorize) and optionally create the product.
     */
    private function buildFromHermes(array $data, AiService $ai, AliExpressService $ae, Store $store, bool $create): array
    {
        $draft = $ae->draftFromFields($data);
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

        $created = null;
        $note = null;
        if ($create) {
            // Use the explicit sale price, or fall back to the auto-suggested
            // price (USD->AOA + margin) when configured.
            $salePrice = $data['price'] ?? $draft['suggested_price'] ?? null;
            if ($salePrice === null) {
                $note = 'Rascunho pronto, mas falta "price" — envie o preco de venda ou configure a taxa USD->AOA.';
            } else {
                $created = $this->createFromDraft($store, $draft, (float) $salePrice, $data['stock'] ?? 0);
            }
        }

        return compact('draft', 'aiApplied', 'aiError', 'created', 'note');
    }

    // ─── Import job queue (SuperLojas -> Hermes) ──────────────────

    /**
     * Hermes polls this for the next pending URL to process. Claims the job
     * atomically (marks it "processing") and returns the URL + job id.
     */
    public function nextImportJob(Request $request)
    {
        if (!$this->checkPermission($request, 'write')) {
            return response()->json(['error' => 'Sem permissao de escrita.'], 403);
        }
        $store = $this->store($request);

        $job = \Illuminate\Support\Facades\DB::transaction(function () use ($store) {
            $j = \App\Models\ImportJob::where('store_id', $store->id)
                ->where('status', 'pending')
                ->orderBy('id')
                ->lockForUpdate()
                ->first();
            if (!$j) return null;
            $j->update(['status' => 'processing', 'claimed_at' => now(), 'attempts' => $j->attempts + 1]);
            return $j;
        });

        if (!$job) {
            return response()->json(['job' => null, 'message' => 'Sem trabalho pendente.']);
        }

        return response()->json([
            'job' => [
                'id' => $job->id,
                'url' => $job->url,
                'spec_url' => url("/api/store-api/{$store->slug}/products/hermes-spec"),
            ],
        ]);
    }

    /**
     * Hermes posts the extracted fields for a claimed job. We enrich + create
     * the product, store the result on the job and mark it done.
     */
    public function completeImportJob(Request $request, $slug, $jobId, AiService $ai, AliExpressService $ae)
    {
        if (!$this->checkPermission($request, 'write')) {
            return response()->json(['error' => 'Sem permissao de escrita.'], 403);
        }
        $store = $this->store($request);

        $job = \App\Models\ImportJob::where('store_id', $store->id)->findOrFail($jobId);
        if ($job->status === 'done') {
            return response()->json(['error' => 'Job ja concluido.'], 422);
        }

        $data = $request->validate($this->hermesRules());
        $r = $this->buildFromHermes($data, $ai, $ae, $store, $data['create'] ?? true);

        $job->update([
            'status' => 'done',
            'completed_at' => now(),
            'product_id' => $r['created']?->id,
            'result' => [
                'created' => (bool) $r['created'],
                'ai_applied' => $r['aiApplied'],
                'draft_name' => $r['draft']['name'] ?? null,
                'note' => $r['note'],
            ],
        ]);

        return response()->json([
            'ok' => true,
            'created' => (bool) $r['created'],
            'product' => $r['created'],
            'note' => $r['note'],
        ]);
    }

    /** Hermes reports it could not process a job. */
    public function failImportJob(Request $request, $slug, $jobId)
    {
        if (!$this->checkPermission($request, 'write')) {
            return response()->json(['error' => 'Sem permissao de escrita.'], 403);
        }
        $store = $this->store($request);
        $data = $request->validate(['error' => 'nullable|string|max:1000']);

        $job = \App\Models\ImportJob::where('store_id', $store->id)->findOrFail($jobId);
        $job->update(['status' => 'failed', 'error' => $data['error'] ?? 'Falha reportada pelo Hermes.']);

        return response()->json(['ok' => true]);
    }

    /**
     * Persist a product from an enriched draft (used by the Hermes bridge).
     */
    private function createFromDraft(Store $store, array $draft, float $price, int $stock): Product
    {
        $slug = Str::slug($draft['name'] ?? 'produto');
        $base = $slug;
        $i = 1;
        while (Product::where('slug', $slug)->exists()) {
            $slug = $base . '-' . $i++;
        }

        return Product::create([
            'store_id' => $store->id,
            'name' => $draft['name'] ?? 'Produto',
            'slug' => $slug,
            'description' => $draft['description'] ?? null,
            'price' => $price,
            'stock' => $stock,
            'images' => $draft['images'] ?? [],
            'category_id' => $draft['category_id'] ?? null,
            'subcategory_id' => $draft['subcategory_id'] ?? null,
            'variants' => $draft['variants'] ?? [],
            'ae_product_id' => $draft['ae_product_id'] ?? null,
            'ae_source_url' => $draft['ae_source_url'] ?? null,
            'ae_cost' => $draft['ae_cost'] ?? null,
            'ae_currency' => $draft['ae_currency'] ?? null,
            'ae_last_synced_at' => now(),
        ]);
    }

    /**
     * Hermes handshake: returns the exact contract Hermes must follow to push
     * AliExpress data. Lets the agent self-configure the connection.
     */
    public function hermesSpec(Request $request)
    {
        $store = $this->store($request);
        $base = url("/api/store-api/{$store->slug}");

        return response()->json([
            'connection' => 'ok',
            'store' => ['name' => $store->name, 'slug' => $store->slug],
            'endpoint' => "{$base}/products/from-hermes",
            'method' => 'POST',
            'auth_headers' => ['X-Api-Key' => '<sk_...>', 'X-Api-Secret' => '<ss_...>'],
            'instructions' => 'Abre a URL do AliExpress num browser real, extrai os campos abaixo e faz POST para o endpoint. A API traduz para portugues, escolhe a categoria e (se create=true) cria o produto.',
            'fields' => [
                'url' => 'string — URL do produto AliExpress',
                'name' => 'string (obrigatorio) — titulo do produto',
                'description' => 'string — descricao completa',
                'images' => 'array de URLs de imagem (galeria completa)',
                'ae_cost' => 'number — preco no AliExpress',
                'ae_currency' => 'string — ex: USD',
                'variants' => 'array — variacoes (cor/tamanho)',
                'price' => 'number — preco de venda em Kz (necessario se create=true)',
                'stock' => 'integer — stock inicial',
                'enrich' => 'boolean (default true) — traduz + escolhe categoria via IA',
                'create' => 'boolean (default false) — cria o produto ja',
            ],
            'example' => [
                'url' => 'https://www.aliexpress.com/item/1005007432415523.html',
                'name' => 'INMAS Q26s Wireless Earbuds Bluetooth',
                'description' => 'Fones sem fio, à prova de água, estéreo HiFi...',
                'images' => ['https://ae01.alicdn.com/kf/xxx.jpg'],
                'ae_cost' => 8.5,
                'ae_currency' => 'USD',
                'variants' => [['cor' => 'preto'], ['cor' => 'branco']],
                'price' => 12000,
                'stock' => 20,
                'enrich' => true,
                'create' => true,
            ],
        ]);
    }

    // ─── Categories (read-only) ───────────────────────────────────

    public function categories(Request $request)
    {
        if (!$this->checkPermission($request, 'read')) {
            return response()->json(['error' => 'Sem permissao de leitura.'], 403);
        }

        $categories = \App\Models\Category::with('subcategories:id,category_id,name,slug')
            ->select('id', 'name', 'slug', 'icon')
            ->orderBy('name')
            ->get();

        return response()->json($categories);
    }

    // ─── Demand (WhatsApp agent) ──────────────────────────────────

    /**
     * Hermes reports what customers ask about on WhatsApp. Each event names a product of this store
     * (product_id or slug) or carries the customer's free text (query), which is matched to the
     * store's products by name. Feeds the home page "Produtos em Destaque" ranking.
     */
    public function reportDemand(Request $request, \App\Services\ProductDemand $demand)
    {
        if (!$this->checkPermission($request, 'write')) {
            return response()->json(['error' => 'Sem permissao de escrita.'], 403);
        }
        $data = $request->validate([
            'events' => 'required|array|min:1|max:50',
            'events.*.product_id' => 'nullable|integer',
            'events.*.slug' => 'nullable|string|max:255',
            'events.*.query' => 'nullable|string|max:200',
            'events.*.count' => 'nullable|integer|min:1|max:20',
        ]);

        $store = $this->store($request);
        $results = [];
        foreach ($data['events'] as $i => $event) {
            $count = (int) ($event['count'] ?? 1);
            $base = Product::where('store_id', $store->id);

            if (!empty($event['product_id']) || !empty($event['slug'])) {
                $product = (clone $base)
                    ->when(!empty($event['product_id']), fn ($q) => $q->where('id', $event['product_id']))
                    ->when(empty($event['product_id']), fn ($q) => $q->where('slug', $event['slug']))
                    ->first(['id', 'store_id', 'name', 'slug']);
                if ($product) {
                    $demand->record($product->id, $product->store_id, 'whatsapp_inquiries', $count);
                }
                $results[] = ['event' => $i, 'matched' => $product ? [['id' => $product->id, 'slug' => $product->slug, 'name' => $product->name]] : []];
                continue;
            }

            $query = \App\Services\ProductDemand::normalise((string) ($event['query'] ?? ''));
            if (mb_strlen($query) < 2) {
                $results[] = ['event' => $i, 'matched' => [], 'error' => 'Indique product_id, slug ou query.'];
                continue;
            }

            $words = $this->queryWords($query);
            $matches = $this->matchProducts($base, $words);

            // Only the product words are kept — never the customer's full message.
            if ($words->isNotEmpty()) $demand->recordSearch($words->implode(' '), 'whatsapp', $matches->count());
            foreach ($matches as $k => $product) {
                // The best match counts as the product asked about; the others as search results.
                $demand->record($product->id, $product->store_id, $k === 0 ? 'whatsapp_inquiries' : 'search_hits', $count);
            }
            $results[] = ['event' => $i, 'matched' => $matches->map(fn ($p) => ['id' => $p->id, 'slug' => $p->slug, 'name' => $p->name])->all()];
        }

        return response()->json(['recorded' => count($results), 'results' => $results]);
    }

    /** Words that say nothing about the product in a WhatsApp question. */
    private const QUERY_STOPWORDS = [
        'ola', 'oi', 'bom', 'boa', 'dia', 'tarde', 'noite', 'tem', 'tens', 'ter', 'teem', 'quero', 'queria',
        'gostaria', 'preciso', 'procuro', 'para', 'por', 'com', 'sem', 'uma', 'uns', 'umas', 'que', 'qual',
        'quais', 'quanto', 'quantos', 'custa', 'preco', 'precos', 'valor', 'voces', 'ainda', 'disponivel',
        'disponiveis', 'esse', 'essa', 'este', 'esta', 'isso', 'aqui', 'sim', 'nao', 'favor', 'obrigado',
        'obrigada', 'mais', 'muito', 'tambem', 'como', 'onde', 'quando', 'loja', 'produto', 'stock', 'estoque',
        'pode', 'podem', 'ver', 'mandar', 'manda', 'foto', 'fotos', 'entrega', 'luanda', 'kz', 'kwanza', 'kwanzas',
    ];

    /** Product words of a question: accents removed, no courtesy words, no long numbers (phones). */
    private function queryWords(string $query): \Illuminate\Support\Collection
    {
        return collect(preg_split('/[^\p{L}\p{N}]+/u', Str::lower(Str::ascii($query))))
            ->filter(fn ($w) => mb_strlen($w) >= 3 && !in_array($w, self::QUERY_STOPWORDS, true) && !preg_match('/^\d{5,}$/', $w))
            ->unique()->take(8)->values();
    }

    /**
     * Up to 3 products of the store best matching a free-text question: name words are compared
     * accent-insensitively and products are ranked by how many of the question's words they contain.
     */
    private function matchProducts($base, \Illuminate\Support\Collection $words)
    {
        if ($words->isEmpty()) return collect();
        $ascii = fn (string $s) => Str::lower(Str::ascii($s));

        return (clone $base)->where('is_active', true)
            ->where(function ($q) use ($words) {
                foreach ($words as $w) $q->orWhere('name', 'like', "%{$w}%");
            })
            ->get(['id', 'store_id', 'name', 'slug', 'stock'])
            ->map(function ($p) use ($words, $ascii) {
                $name = $ascii($p->name);
                $p->hits = $words->filter(fn ($w) => str_contains($name, $w))->count();
                return $p;
            })
            ->filter(fn ($p) => $p->hits > 0)
            ->sortBy([['hits', 'desc'], ['stock', 'desc']])
            ->take(3)
            ->values();
    }

    /** Most demanded products of this store (default last 30 days), with the counters behind the score. */
    public function demandRanking(Request $request, \App\Services\ProductDemand $demand)
    {
        if (!$this->checkPermission($request, 'read')) {
            return response()->json(['error' => 'Sem permissao de leitura.'], 403);
        }
        $days = min(max((int) $request->query('days', 30), 1), 90);
        $store = $this->store($request);
        $scores = $demand->scores($days, $store->id, 50);
        $totals = $demand->totals($days, $store->id);
        $products = Product::whereIn('id', array_keys($scores))->get(['id', 'name', 'slug', 'price', 'stock'])->keyBy('id');

        $ranking = collect($scores)->map(function ($score, $id) use ($products, $totals) {
            $p = $products[$id] ?? null;
            if (!$p) return null;
            $t = $totals[$id] ?? null;
            return [
                'id' => $p->id, 'name' => $p->name, 'slug' => $p->slug, 'price' => $p->price, 'stock' => $p->stock,
                'score' => round($score, 1),
                'whatsapp_inquiries' => (int) ($t->whatsapp_inquiries ?? 0),
                'whatsapp_clicks' => (int) ($t->whatsapp_clicks ?? 0),
                'cart_adds' => (int) ($t->cart_adds ?? 0),
                'search_hits' => (int) ($t->search_hits ?? 0),
                'views' => (int) ($t->views ?? 0),
            ];
        })->filter()->values();

        $topSearches = \Illuminate\Support\Facades\DB::table('search_terms_daily')
            ->where('day', '>=', now()->subDays($days)->toDateString())
            ->groupBy('term')
            ->selectRaw('term, SUM(count) as count, MIN(results) as min_results')
            ->orderByDesc('count')
            ->limit(20)
            ->get();

        return response()->json(['days' => $days, 'products' => $ranking, 'top_searches' => $topSearches]);
    }
}
