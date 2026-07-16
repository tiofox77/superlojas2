# Integração Hermes ↔ SuperLojas — Guia Completo

Documento para configurar o agente **Hermes** como ponte entre o **AliExpress** e o marketplace **SuperLojas**. Cobre autenticação, todos os endpoints, os dois modelos de comunicação (fila/polling e webhook/push) e como o Hermes deve criar o seu próprio webhook.

> **Base da API:** `https://superloja.vip/api`
> **Base da loja (store-api):** `https://superloja.vip/api/store-api/{SLUG_DA_LOJA}`

---

## 1. Visão geral da arquitetura

O SuperLojas obtém os dados do produto em **3 níveis** (degrada automaticamente):

```
1. API oficial AliExpress  (se App Key/Secret configuradas)
        ↓ (se não configurada)
2. Scraper HTML server-side (pega título + imagem principal; NÃO pega preço/variações)
        ↓ (se bloqueado / incompleto)
3. Bridge do Hermes         (browser real: pega TUDO — preço, galeria, variações)
```

O Hermes existe para o nível 3: **abrir a página no browser, extrair tudo e devolver ao SuperLojas**, que traduz para português de Angola, escolhe a categoria (IA) e cria o produto.

**Duas direções de comunicação:**

| Direção | Modelo | Quando usar |
|---------|--------|-------------|
| SuperLojas → Hermes | **Webhook (push)** | Hermes tem endpoint próprio. SuperLojas avisa na hora. |
| SuperLojas → Hermes | **Fila (polling)** | Hermes não tem endpoint. Ele pergunta "há trabalho?". |
| Hermes → SuperLojas | **store-api** | Sempre — é como o Hermes devolve os dados e cria produtos. |

---

## 2. Autenticação

Toda chamada do Hermes ao SuperLojas usa a chave de API da loja (painel da loja → **Configurações → API**):

```
X-Api-Key: sk_xxxxxxxxxxxxxxxxxxxxxxxx
X-Api-Secret: ss_xxxxxxxxxxxxxxxxxxxxxxxx
```

Envie **sempre os dois headers**. A loja é identificada pelo `slug` na URL.

Erros de auth:
- `401` — chave/secret ausente ou inválido.
- `403` — sem permissão `write`, API desativada, plano sem API ou loja não aprovada.

---

## 3. Handshake — descobrir o contrato

Antes de tudo, o Hermes pode consultar o contrato exato:

```bash
GET /store-api/{slug}/products/hermes-spec
```
```bash
curl "https://superloja.vip/api/store-api/minha-loja/products/hermes-spec" \
  -H "X-Api-Key: sk_..." -H "X-Api-Secret: ss_..."
```

Retorna o endpoint de entrega, os campos esperados e um exemplo. Use uma vez para se autoconfigurar.

---

## 4. Modelo A — Webhook (push) *(recomendado se o Hermes tiver endpoint)*

### 4.1. O que o Hermes precisa criar

O Hermes deve expor **um endpoint HTTP próprio** (o "webhook"), por exemplo:

```
POST https://hermes.seu-dominio.com/superloja-webhook
```

Depois, no painel do SuperLojas (**Admin → AliExpress → Credenciais → Webhook do Hermes**), cola-se:
- **URL do webhook** = o endereço acima.
- **Secret partilhado** = uma string aleatória (ex.: 32 chars) — usada para assinar/verificar.

### 4.2. O que o SuperLojas envia

Quando uma URL é enfileirada, o SuperLojas faz **POST** para o webhook do Hermes com este corpo JSON:

```json
{
  "event": "import_job.created",
  "job_id": 42,
  "store_slug": "minha-loja",
  "url": "https://www.aliexpress.com/item/1005006XXXX.html",
  "spec_url":     "https://superloja.vip/api/store-api/minha-loja/products/hermes-spec",
  "complete_url": "https://superloja.vip/api/store-api/minha-loja/products/import-jobs/42/complete",
  "fail_url":     "https://superloja.vip/api/store-api/minha-loja/products/import-jobs/42/fail",
  "timestamp": "2026-07-16T12:00:00+00:00"
}
```

E um header de assinatura:

```
X-SuperLojas-Signature: sha256=<HMAC_SHA256(corpo_bruto, secret)>
```

Há também um evento de teste `{"event":"ping"}` (botão "Testar webhook" no painel).

### 4.3. Como o Hermes deve verificar e responder

1. **Verificar a assinatura** (segurança — garante que veio do SuperLojas):
   calcular `HMAC-SHA256` do corpo **bruto** recebido usando o secret partilhado, e comparar com o header `X-SuperLojas-Signature` (após `sha256=`). Se não bater → responder `401` e ignorar.
2. **Responder rápido** `200 OK` imediatamente (não processar de forma síncrona; enfileirar internamente).
3. **Processar**: abrir `url` no browser, extrair os dados, e fazer POST para `complete_url` (ver secção 6).

**Exemplo de receiver (Node.js / Express):**

```js
const crypto = require("crypto");
const express = require("express");
const app = express();

const SECRET = process.env.SUPERLOJA_WEBHOOK_SECRET;

// IMPORTANTE: capturar o corpo BRUTO para validar a assinatura
app.post("/superloja-webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const raw = req.body; // Buffer
    const sig = (req.get("X-SuperLojas-Signature") || "").replace("sha256=", "");
    const expected = crypto.createHmac("sha256", SECRET).update(raw).digest("hex");

    // comparação segura
    const ok = sig.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    if (!ok) return res.status(401).send("assinatura invalida");

    const evt = JSON.parse(raw.toString());
    res.status(200).send("ok"); // responder já

    if (evt.event === "ping") return;
    if (evt.event === "import_job.created") {
      // enfileirar internamente e processar (abrir browser -> extrair -> POST complete_url)
      processarJob(evt).catch(console.error);
    }
  }
);

app.listen(3000);
```

---

## 5. Modelo B — Fila (polling) *(se o Hermes NÃO tiver endpoint)*

O Hermes pergunta periodicamente se há trabalho.

### 5.1. Pedir a próxima URL

```bash
GET /store-api/{slug}/products/import-jobs/next
```
- Com trabalho: `{ "job": { "id": 42, "url": "https://...", "spec_url": "..." } }` (o job passa a `processing` automaticamente).
- Fila vazia: `{ "job": null }` → esperar ~30 s e repetir.

```bash
curl "https://superloja.vip/api/store-api/minha-loja/products/import-jobs/next" \
  -H "X-Api-Key: sk_..." -H "X-Api-Secret: ss_..."
```

**Loop recomendado:** chamar `next` → se `job` existir, processar e devolver (secção 6) → chamar `next` de novo. Se `null`, aguardar 30 s.

---

## 6. Hermes → SuperLojas — devolver os dados e criar o produto

Após abrir a página e extrair, o Hermes faz POST. Há dois caminhos equivalentes:

### 6.1. Concluir um job (fila ou webhook)

```bash
POST /store-api/{slug}/products/import-jobs/{job_id}/complete
```

### 6.2. Bridge direto (sem job — importação avulsa)

```bash
POST /store-api/{slug}/products/from-hermes
```

Ambos aceitam **o mesmo corpo**:

```bash
curl -X POST "https://superloja.vip/api/store-api/minha-loja/products/import-jobs/42/complete" \
  -H "X-Api-Key: sk_..." -H "X-Api-Secret: ss_..." \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.aliexpress.com/item/1005006XXXX.html",
    "name": "INMAS Q26s Wireless Earbuds Bluetooth",
    "description": "descrição completa extraída da página...",
    "images": ["https://ae01.alicdn.com/kf/aaa.jpg", "https://ae01.alicdn.com/kf/bbb.jpg"],
    "ae_cost": 8.50,
    "ae_currency": "USD",
    "variants": [{"cor":"preto"},{"cor":"branco"}],
    "price": 12000,
    "stock": 20,
    "enrich": true,
    "create": true
  }'
```

### Se falhar (página não abre, produto indisponível):

```bash
POST /store-api/{slug}/products/import-jobs/{job_id}/fail
{ "error": "pagina nao abriu" }
```

---

## 7. Referência dos campos

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| `name` | ✅ | Título do produto |
| `description` | — | Descrição completa (o Hermes extrai a versão longa) |
| `images` | — | **Array de URLs** da galeria completa |
| `ae_cost` | — | Preço no AliExpress (número) |
| `ae_currency` | — | Moeda do custo, ex.: `"USD"` |
| `variants` | — | Array de variações (cor/tamanho) |
| `url` | — | URL do produto AliExpress |
| `price` | necessário se `create:true` | **Preço de venda em Kz** (com margem) |
| `stock` | — | Stock inicial (int) |
| `enrich` | — | `true` (padrão): IA traduz p/ PT-Angola + escolhe categoria |
| `create` | — | `true`: cria o produto já; `false`: só devolve o rascunho |

> `ae_cost` = **custo** no AliExpress · `price` = **venda** no SuperLojas. A diferença é a margem (visível nas "Encomendas ao fornecedor").

---

## 8. Outros endpoints úteis (store-api)

| Ação | Método · Caminho |
|------|------------------|
| Info da loja | `GET /` |
| Listar produtos | `GET /products` (filtros: `search`, `category_id`, `badge`, `in_stock`, `sort`, `per_page`) |
| Ver produto | `GET /products/{id}` |
| Criar produto (JSON URLs ou multipart c/ ficheiros) | `POST /products` |
| Atualizar produto | `PUT /products/{id}` |
| Apagar produto | `DELETE /products/{id}` |
| Listar categorias (p/ escolher `category_id`) | `GET /categories` |

**Upload de foto por ficheiro** (em vez de URL): usar `multipart/form-data` com `images[]=@ficheiro` no `POST /products` (JPG/PNG/WEBP/GIF, máx 10 MB cada).

---

## 9. Códigos de resposta

| Código | Significado | Ação do Hermes |
|--------|-------------|----------------|
| `200` / `201` | Sucesso | Continuar |
| `401` | Auth inválida / assinatura webhook inválida | Rever chaves/secret |
| `403` | Sem permissão `write` / plano sem API / loja não aprovada | Avisar o dono da loja |
| `422` | Validação (falta `name`/`price`, `category_id` inexistente, imagem > 10 MB, limite do plano) | Ler `error`/`errors` e corrigir |
| `404` | Produto/job não pertence à loja | Confirmar o id |

---

## 10. Fluxo recomendado (resumo)

```
[Admin no painel] cola URL(s) → escolhe loja → "Enviar para a fila"
        │
        ├─ (webhook configurado) → SuperLojas faz POST assinado ao Hermes ─┐
        │                                                                   │
        └─ (sem webhook) → Hermes chama GET .../import-jobs/next ───────────┤
                                                                            ▼
                                                    [Hermes] abre a URL no browser
                                                    extrai: name, description, images,
                                                            ae_cost, variants
                                                                            │
                                                                            ▼
                                          POST .../import-jobs/{id}/complete (enrich=true, create=true)
                                                                            │
                                                                            ▼
                                    SuperLojas: traduz (PT-AO) + escolhe categoria (IA) + cria produto
                                                                            │
                                                                            ▼
                                            job = "done" · produto publicado · margem calculada
```

---

## 11. Segurança — boas práticas para o Hermes

- Guardar `X-Api-Key`/`X-Api-Secret` e o `webhook secret` em variáveis de ambiente, nunca no código.
- **Sempre verificar** a assinatura `X-SuperLojas-Signature` antes de agir sobre um webhook.
- Responder `200` ao webhook rapidamente e processar de forma assíncrona.
- Processar **um produto de cada vez** e validar o `2xx` antes de seguir.
- Respeitar os limites do plano (produtos, imagens) — em `422`, ler a mensagem.

---

*Endpoints implementados e ativos em produção. Requer as migrations aplicadas (colunas `ae_*`, tabelas `supplier_orders` e `import_jobs`) para persistir jobs e criar produtos.*
