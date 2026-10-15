# Hermes → SuperLoja: o que os clientes perguntam no WhatsApp

Os **Produtos em Destaque** da página inicial (superloja.vip) são os produtos
mais procurados nos últimos 30 dias. A semana mais recente conta a dobrar.

| Sinal | Pontos | Quem regista |
|---|---|---|
| Pergunta no WhatsApp sobre o produto | 5 | **Hermes** (este documento) |
| Clique em "Comprar via WhatsApp" no site | 4 | site (automático) |
| Adicionado ao carrinho | 3 | site (automático) |
| Aparece nos resultados de uma pesquisa | 2 | site / Hermes |
| Visita à página do produto | 1 | site (automático) |

Só aparecem produtos com stock. Enquanto houver poucos dados, a lista é
completada com os destaques aprovados e os produtos em alta.

## Autenticação

É a mesma API da loja que o Hermes já usa: os headers `X-Api-Key` e
`X-Api-Secret`, gerados no painel da loja em **Definições → API**. Nunca
publique essas chaves em lado nenhum.

```
Base: https://superloja.vip/api/store-api/{slug-da-loja}
```

## 1. Registar perguntas — `POST /demand`

Chame sempre que um cliente perguntar por um produto. Pode enviar até 50
eventos de uma vez.

```http
POST /api/store-api/superloja/demand
X-Api-Key: …
X-Api-Secret: …
Content-Type: application/json

{
  "events": [
    { "product_id": 412 },
    { "slug": "carregador-usb-c-gan-65w-2-portas-com-cabo" },
    { "query": "tem fones bluetooth com caixa transparente?" },
    { "query": "cabo usb c 2 metros", "count": 2 }
  ]
}
```

- Se já sabe qual é o produto, envie `product_id` ou `slug`. É o mais exato.
- Se não sabe, envie `query` com o texto do cliente. A SuperLoja escolhe até 3
  produtos da loja pelo nome:
  - o mais parecido conta como **pergunta**;
  - os outros contam como **resultado de pesquisa**.

  Do texto, só se guardam as palavras de produto: cumprimentos, números de
  telefone e o resto da mensagem nunca são gravados.
- `count` (1–20, opcional) serve para registar várias perguntas iguais de uma vez.
- Não envie dados pessoais (nome, telefone, morada). Basta o produto ou o texto da pergunta.

Resposta:

```json
{
  "recorded": 4,
  "results": [
    { "event": 0, "matched": [{ "id": 412, "slug": "…", "name": "…" }] },
    { "event": 2, "matched": [{ "id": 388, "slug": "…", "name": "Auriculares Air TWS …" }] }
  ]
}
```

Se `matched` vier vazio, a loja não tem esse produto. É uma boa pista para
sugerir uma alternativa ao cliente ou para avisar o dono da loja.

## 2. Consultar o ranking — `GET /demand?days=30`

Mostra os produtos mais procurados da loja, os contadores de cada sinal e as
pesquisas mais feitas (no site e no WhatsApp). `days` vai de 1 a 90. Use-o
para responder "quais são os mais vendidos/procurados?" ou para sugerir
produtos.

```json
{
  "days": 30,
  "products": [
    { "id": 412, "name": "…", "slug": "…", "price": "9500.00", "stock": 8, "score": 37.5,
      "whatsapp_inquiries": 5, "whatsapp_clicks": 2, "cart_adds": 1, "search_hits": 4, "views": 11 }
  ],
  "top_searches": [{ "term": "carregador iphone", "count": 9, "min_results": 3 }]
}
```

## Regras para o Hermes

1. Uma chamada por pergunta (ou em lote, a cada poucos minutos). Não repita a
   mesma conversa: o servidor não deteta duplicados vindos do Hermes.
2. Se o pedido falhar, não insista: tente mais tarde ou descarte o evento.
3. Os produtos com stock 0 continuam a aparecer na API, para o Hermes poder
   dizer "esgotado" e tratar de reservas. Só a página inicial e a página da
   loja os escondem.
