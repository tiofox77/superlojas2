<?php
/**
 * Script de Teste — Store API (TechZone Angola)
 * 
 * Uso: php test-api.php
 */

$baseUrl   = 'https://superloja.vip/api/store-api/techzone-angola';
$apiKey    = 'sk_vx8E5hN4a5mabC7SZDbpWucr6F56RYP9MNW6ha5qjMxzzSoP';
$apiSecret = 'ss_5WKsfb0chPIiOT8GacIfFTFryndOB7Mx2wltq8mBccmHNFQ0';

// ─── Helper ──────────────────────────────────────────────────
function api(string $method, string $url, array $data = null): array
{
    global $apiKey, $apiSecret;

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_HTTPHEADER     => [
            'Accept: application/json',
            'Content-Type: application/json',
            "X-Api-Key: $apiKey",
            "X-Api-Secret: $apiSecret",
        ],
        CURLOPT_SSL_VERIFYPEER => false,
    ]);

    if ($data !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error    = curl_error($ch);
    curl_close($ch);

    if ($error) {
        return ['_error' => $error, '_code' => 0];
    }

    return ['_code' => $httpCode, '_body' => json_decode($response, true)];
}

function printResult(string $title, array $result): void
{
    echo "\n" . str_repeat('═', 60) . "\n";
    echo "  $title\n";
    echo str_repeat('═', 60) . "\n";
    echo "HTTP {$result['_code']}\n";

    if (isset($result['_error'])) {
        echo "ERRO: {$result['_error']}\n";
        return;
    }

    echo json_encode($result['_body'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
}

// ─── 1. Info da Loja ─────────────────────────────────────────
$r = api('GET', "$baseUrl/");
printResult('1. INFO DA LOJA', $r);

// ─── 2. Listar Categorias ───────────────────────────────────
$r = api('GET', "$baseUrl/categories");
printResult('2. CATEGORIAS', $r);

// ─── 3. Listar Produtos ─────────────────────────────────────
$r = api('GET', "$baseUrl/products?per_page=5");
printResult('3. PRODUTOS (primeiros 5)', $r);

// ─── 4. Criar Produto ───────────────────────────────────────
$newProduct = [
    'name'           => 'Produto Teste API - ' . date('His'),
    'price'          => 15000,
    'original_price' => 20000,
    'description'    => 'Produto criado via API externa para teste.',
    'category'       => 'Electronica',
    'stock'          => 50,
    'badge'          => 'Novo',
    'images'         => [],
];

$r = api('POST', "$baseUrl/products", $newProduct);
printResult('4. CRIAR PRODUTO', $r);

$createdId = $r['_body']['id'] ?? null;

// ─── 5. Ver Produto Criado ──────────────────────────────────
if ($createdId) {
    $r = api('GET', "$baseUrl/products/$createdId");
    printResult('5. VER PRODUTO CRIADO (id=' . $createdId . ')', $r);
}

// ─── 6. Actualizar Produto ──────────────────────────────────
if ($createdId) {
    $r = api('PUT', "$baseUrl/products/$createdId", [
        'price' => 12500,
        'stock' => 100,
        'badge' => 'Promo',
    ]);
    printResult('6. ACTUALIZAR PRODUTO', $r);
}

// ─── 7. Eliminar Produto ────────────────────────────────────
if ($createdId) {
    $r = api('DELETE', "$baseUrl/products/$createdId");
    printResult('7. ELIMINAR PRODUTO', $r);
}

// ─── Resumo ─────────────────────────────────────────────────
echo "\n" . str_repeat('═', 60) . "\n";
echo "  TESTE COMPLETO!\n";
echo str_repeat('═', 60) . "\n";
echo "Base URL: $baseUrl\n";
echo "Endpoints testados:\n";
echo "  GET  /                   → Info da loja\n";
echo "  GET  /categories         → Categorias\n";
echo "  GET  /products           → Listar produtos\n";
echo "  POST /products           → Criar produto\n";
echo "  GET  /products/{id}      → Ver produto\n";
echo "  PUT  /products/{id}      → Actualizar produto\n";
echo "  DELETE /products/{id}    → Eliminar produto\n";
echo str_repeat('═', 60) . "\n";
