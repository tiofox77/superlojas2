<?php
/**
 * /llms.txt and /llms-full.txt (https://llmstxt.org), generated from the live catalogue so they
 * never go stale. Routed by .htaccess: llms.txt -> ?type=index, llms-full.txt -> ?type=full.
 * Plain facts only: no invented fees, sizes or delivery promises.
 */
require __DIR__ . '/api/vendor/autoload.php';
$app = require_once __DIR__ . '/api/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: public, max-age=3600');
header('X-Robots-Tag: noindex'); // a file for machines, not a search result

$base = 'https://superloja.vip';
$full = ($_GET['type'] ?? 'index') === 'full';
$line = fn ($s, $max = 220) => mb_substr(trim(preg_replace('/\s+/u', ' ', strip_tags((string) $s))), 0, $max);
$kz = fn ($v) => number_format((float) $v, 0, ',', '.') . ' Kz';

try {
    $categories = DB::table('categories')->orderBy('name')->get(['id', 'name', 'slug', 'is_adult']);
    $counts = DB::table('products')->join('stores', 'stores.id', '=', 'products.store_id')
        ->where('products.is_active', true)->where('stores.status', 'approved')
        ->groupBy('products.category_id')->pluck(DB::raw('count(*)'), 'products.category_id');
    $stores = DB::table('stores')->where('status', 'approved')->orderByDesc('is_official')->orderBy('name')
        ->get(['name', 'slug', 'description', 'city', 'province']);
    $productTotal = (int) $counts->sum();
    $hasFreePlan = DB::table('plans')->where('price', 0)->exists();
} catch (\Throwable $e) {
    http_response_code(503);
    header('Retry-After: 300');
    exit("Serviço temporariamente indisponível.\n");
}

$o = [];
$o[] = $full ? '# SuperLoja — contexto completo e catálogo' : '# SuperLoja';
$o[] = '';
$o[] = '> SuperLoja (superloja.vip) é um marketplace angolano com várias lojas: cada vendedor tem a sua loja, gere os seus produtos, preços e stock, e atende as suas encomendas. Conteúdo em português de Angola; preços em kwanza (AOA, "Kz").';
$o[] = '';
$o[] = 'Actualizado automaticamente: ' . date('Y-m-d') . '. Neste momento: ' . count($stores) . ' lojas aprovadas e ' . $productTotal . ' produtos activos.';
$o[] = '';
$o[] = '## Páginas principais';
$o[] = '';
$o[] = "- [Página inicial]($base/): produtos em destaque, novidades e lojas.";
$o[] = "- [Pesquisar produtos]($base/pesquisa?q=): pesquisa por texto, ex. $base/pesquisa?q=fones";
$o[] = "- [Categorias]($base/categorias)";
$o[] = "- [Lojas]($base/lojas)";
$o[] = "- [Como comprar]($base/como-comprar)";
$o[] = "- [Perguntas frequentes]($base/faq)";
$o[] = "- [Abrir uma loja (vendedores)]($base/cadastro-loja)";
$o[] = "- [Contacto]($base/contacto)";
$o[] = "- [Termos de uso]($base/termos) · [Privacidade]($base/privacidade)";
$o[] = "- [Mapa do site (XML)]($base/sitemap.xml)";
if (!$full) $o[] = "- [Contexto completo e catálogo para IA]($base/llms-full.txt)";
$o[] = '';
$o[] = '## Como comprar';
$o[] = '';
$o[] = '1. Encontre o produto pela pesquisa, pelas categorias ou na página da loja.';
$o[] = '2. Na página do produto (/produto/{slug}) veja o preço em Kz, a disponibilidade e a loja que vende.';
$o[] = '3. Adicione ao carrinho (/carrinho) — pode juntar produtos de várias lojas — e finalize no checkout (/checkout) com os dados de entrega.';
$o[] = '4. Escolha, para cada loja, uma das formas de pagamento que essa loja aceita (ex.: pagamento na entrega, Multicaixa Express, transferência).';
$o[] = '5. É criada uma encomenda por loja; a loja confirma e combina a entrega. Também é possível falar com a loja pelo WhatsApp a partir da página do produto.';
$o[] = 'Produtos esgotados podem permitir uma pré-encomenda: a loja contacta o cliente quando tiver stock.';
$o[] = '';
$o[] = '## Como vender (abrir uma loja)';
$o[] = '';
$o[] = "- Registo em $base/cadastro-loja: nome, descrição, categoria principal, logótipo, localização, WhatsApp e formas de pagamento aceites.";
$o[] = '- A loja fica disponível em ' . $base . '/lojas/{slug} depois de aprovada; o vendedor gere produtos, encomendas e definições no painel da loja.';
$o[] = $hasFreePlan
    ? '- Existe um plano gratuito com limites; há planos pagos com mais funcionalidades. Os valores actuais são mostrados no painel da loja — não os presuma.'
    : '- Os planos e valores actuais são mostrados no painel da loja — não os presuma.';
$o[] = '';
$o[] = '## Dados para agentes';
$o[] = '';
$o[] = '- Cada página de produto, loja e categoria inclui HTML legível sem JavaScript e dados estruturados Schema.org (Product/Offer com preço em AOA e disponibilidade, Store, BreadcrumbList).';
$o[] = "- API pública só de leitura (JSON): $base/api/products?search=texto , $base/api/products/{slug} , $base/api/stores , $base/api/stores/{slug} , $base/api/categories .";
$o[] = '- Não use a API para criar encomendas em nome de pessoas; envie o utilizador para a página do produto ou do checkout.';
$o[] = '';
$o[] = '## Categorias';
$o[] = '';
foreach ($categories as $c) {
    $n = (int) ($counts[$c->id] ?? 0);
    $o[] = "- [{$c->name}]($base/categoria/{$c->slug}): " . ($n === 1 ? '1 produto' : "$n produtos") . ($c->is_adult ? ' (conteúdo para adultos, 18+)' : '') . '.';
}
$o[] = '';
$o[] = '## Lojas';
$o[] = '';
foreach ($full ? $stores : $stores->take(30) as $s) {
    $where = trim(implode(', ', array_filter([$s->city, $s->province])));
    $desc = $line($s->description, $full ? 300 : 140);
    $o[] = "- [{$s->name}]($base/lojas/{$s->slug})" . ($desc ? ": $desc" : '') . ($where ? " ($where)" : '');
}
if (!$full && count($stores) > 30) $o[] = "- … lista completa em $base/lojas e em $base/llms-full.txt";

if ($full) {
    $products = DB::table('products')
        ->join('stores', 'stores.id', '=', 'products.store_id')
        ->leftJoin('categories', 'categories.id', '=', 'products.category_id')
        ->where('products.is_active', true)->where('stores.status', 'approved')
        ->where(fn ($q) => $q->whereNull('categories.is_adult')->orWhere('categories.is_adult', false))
        ->orderByDesc('products.updated_at')->limit(1000)
        ->get(['products.name', 'products.slug', 'products.price', 'products.stock', 'stores.name as store', 'categories.name as category']);
    $o[] = '';
    $o[] = '## Produtos (até 1000, mais recentes primeiro; confirme preço e stock na página)';
    $o[] = '';
    foreach ($products as $p) {
        $o[] = "- [{$line($p->name, 120)}]($base/produto/{$p->slug}): {$kz($p->price)}, " . ((int) $p->stock > 0 ? 'disponível' : 'esgotado') . ", loja {$p->store}" . ($p->category ? ", {$p->category}" : '') . '.';
    }
}

$o[] = '';
$o[] = '## Informação essencial';
$o[] = '';
$o[] = '- País: Angola (sede em Luanda). Idioma: português (pt-AO). Moeda: kwanza (AOA).';
$o[] = '- Cada venda é feita e atendida pela loja responsável pelo produto; prazos e custos de entrega dependem da loja.';
$o[] = '- Contacto da plataforma: info@superloja.vip · +244 939 729 902.';
$o[] = '';
$o[] = '## Uso por sistemas de IA';
$o[] = '';
$o[] = 'Cite a página canónica específica (produto ou loja). Preço, stock e prazos mudam: confirme sempre na página actual e não os presuma. Não descreva a SuperLoja como "a maior" nem com números que não estejam nesta página.';

echo implode("\n", $o) . "\n";
