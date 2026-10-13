# SuperLoja — Documentação Completa do Projecto

> **Versão:** Abril 2026 | **URL:** https://superloja.vip | **API Base:** https://superloja.vip/api

---

## 1. O que é o SuperLoja?

SuperLoja é um **marketplace multi-loja angolano** onde qualquer pessoa ou empresa pode abrir a sua loja online gratuitamente e vender produtos para toda Angola. Funciona como um shopping virtual — vários vendedores, um só endereço.

**Modelo de negócio:**
- Registo gratuito (plano Grátis com limites)
- Planos pagos mensais para mais funcionalidades (mais produtos, analytics, API, POS, subdomínio)
- Cada loja gere os seus produtos, preços, stock e encomendas de forma independente

**Público-alvo:** Empreendedores angolanos, pequenas e médias empresas, revendedores, artesãos, importadores.

**Moeda principal:** Kwanza (Kz) — código AOA, exibido como "Kz".

---

## 2. Stack Técnico

| Componente | Tecnologia |
|---|---|
| **Frontend** | React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui |
| **Backend (API)** | Laravel 11 (PHP 8.2+) |
| **Base de dados** | MySQL 8 |
| **Autenticação** | Laravel Sanctum (Bearer tokens) |
| **Hosting** | cPanel (SoftecHost) com FTP deploy |
| **PWA** | Service Worker + manifest dinâmico |
| **Notificações** | Web Push (VAPID) + Email (SMTP) |
| **Domínio** | superloja.vip |

---

## 3. Estrutura da Plataforma

### Áreas do Site

| Área | URL | Descrição |
|---|---|---|
| **Homepage** | `/` | Banners, produtos em destaque, trending, flash sale, categorias |
| **Categorias** | `/categorias` | Lista de categorias com contagem de produtos |
| **Lojas** | `/lojas` | Directório de todas as lojas aprovadas |
| **Detalhe Loja** | `/lojas/{slug}` | Página da loja com produtos, banner, info |
| **Detalhe Produto** | `/produto/{slug}` | Ficha completa do produto |
| **Flash Sale** | `/flash-sale` | Produtos em promoção com temporizador |
| **Carrinho** | `/carrinho` | Carrinho de compras multi-loja |
| **Checkout** | `/checkout` | Finalização de compra com dados e pagamento |
| **Registo Loja** | `/registar-loja` | Formulário para abrir loja |
| **Painel Cliente** | `/cliente/*` | Dashboard do comprador (pedidos, perfil, favoritos) |
| **Painel Loja** | `/loja/{slug}/painel/*` | Gestão da loja (produtos, pedidos, analytics) |
| **Admin** | `/admin/*` | Super admin (lojas, produtos, categorias, planos, analytics) |

### Entidades Principais

| Entidade | Descrição |
|---|---|
| **User** | Utilizador registado (comprador ou vendedor) |
| **Store** | Loja de um vendedor (1 user pode ter várias lojas) |
| **Product** | Produto à venda numa loja |
| **Category** | Categoria de produtos (ex: Electrónica, Moda) |
| **Subcategory** | Subcategoria (ex: Smartphones, Laptops) |
| **Order** | Encomenda feita por um comprador |
| **Plan** | Plano de subscrição (Grátis, Básico, Pro, Premium) |
| **Subscription** | Subscrição activa de uma loja a um plano |
| **Review** | Avaliação da plataforma por utilizadores |
| **HeroSlide** | Banner rotativo (global ou por loja) |

---

## 4. API Pública (Sem Autenticação)

**Base URL:** `https://superloja.vip/api`

### 4.1 Categorias

```http
GET /api/categories
```
Retorna todas as categorias com subcategorias e contagem dinâmica de produtos activos.

```http
GET /api/categories/{slug}
```
Detalhe de uma categoria com subcategorias.

### 4.2 Lojas

```http
GET /api/stores
```
Lista de lojas aprovadas. Suporta filtros: `?province=Luanda`, `?search=nome`, `?featured=1`.

```http
GET /api/stores/featured
```
Lojas em destaque.

```http
GET /api/stores/{slug}
```
Detalhe de uma loja com produtos, categorias, info completa.

### 4.3 Produtos

```http
GET /api/products
```

**Resposta paginada:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "iPhone 15 Pro",
      "slug": "iphone-15-pro",
      "price": "450000.00",
      "original_price": "500000.00",
      "currency": "Kz",
      "stock": 5,
      "badge": "Novo",
      "images": ["/storage/stores/1/products/img.jpg"],
      "category_id": 3,
      "subcategory_id": 12,
      "store": {
        "id": 1,
        "name": "SuperLoja",
        "slug": "superloja",
        "logo": "/storage/stores/1/logos/logo.png",
        "province": "Luanda",
        "city": "Luanda",
        "whatsapp": "+244923456789",
        "is_official": true
      },
      "category_relation": { "id": 3, "name": "Electrónica", "slug": "electronica" },
      "subcategory": { "id": 12, "name": "Smartphones", "slug": "smartphones" }
    }
  ],
  "current_page": 1,
  "last_page": 4,
  "per_page": 24,
  "total": 90,
  "from": 1,
  "to": 24
}
```

**Filtros disponíveis:**

| Param | Exemplo | Descrição |
|---|---|---|
| `search` | `?search=iphone` | Pesquisa por nome/descrição |
| `category_id` | `?category_id=3` | Filtrar por categoria |
| `subcategory_id` | `?subcategory_id=12` | Filtrar por subcategoria |
| `store_id` | `?store_id=1` | Filtrar por loja |
| `badge` | `?badge=Novo` | Filtrar por badge (Novo, Promo, Usado) |
| `min_price` | `?min_price=10000` | Preço mínimo |
| `max_price` | `?max_price=50000` | Preço máximo |
| `in_stock` | `?in_stock=1` | Só com stock > 0 |
| `out_of_stock` | `?out_of_stock=1` | Só esgotados |
| `has_image` | `?has_image=1` | Só com imagens |
| `featured` | `?featured=1` | Só destaques aprovados |
| `sort` | `?sort=price` | Ordenar por: created_at, price, name, rating, stock |
| `dir` | `?dir=asc` | Direcção: asc ou desc |
| `per_page` | `?per_page=12` | Itens por página (max 100) |
| `page` | `?page=2` | Página |

**Endpoints especiais:**

```http
GET /api/products/trending      # Produtos mais vistos
GET /api/products/latest        # Últimos adicionados
GET /api/products/featured      # Em destaque (aprovados pelo admin)
GET /api/products/flash-sale    # Em promoção com temporizador activo
GET /api/products/{slug}        # Detalhe completo de um produto
```

### 4.4 Hero Slides (Banners)

```http
GET /api/hero-slides                # Banners globais da homepage
GET /api/hero-slides/store/{slug}   # Banners de uma loja específica
```

### 4.5 Províncias

```http
GET /api/provinces              # Lista das 18 províncias de Angola
```

### 4.6 Reviews

```http
GET /api/reviews                # Avaliações públicas da plataforma
```

---

## 5. API Externa da Loja (Store API)

Para lojas com plano que inclui API. Autenticação via API Key + Secret.

**Base URL:** `https://superloja.vip/api/store-api/{slug}`

### 5.1 Autenticação

Enviar em todos os requests:

```http
X-Api-Key: sk_abc123...
X-Api-Secret: ss_xyz789...
```

Ou como query params: `?api_key=sk_abc123&api_secret=ss_xyz789`

As chaves são geradas no painel da loja em **Definições → API**.

### 5.2 Permissões

As permissões são configuráveis: `read`, `write`, `delete`. Por defeito todas activas.

### 5.3 Endpoints

#### Info da Loja
```http
GET /api/store-api/{slug}/
```
Retorna dados da loja, plano activo e contagem de produtos.

#### Listar Produtos
```http
GET /api/store-api/{slug}/products
```
Paginado. Suporta filtros: `category`, `category_id`, `badge`, `search`, `in_stock`, `sort`, `order`, `per_page`.

#### Ver Produto
```http
GET /api/store-api/{slug}/products/{id}
```

#### Criar Produto
```http
POST /api/store-api/{slug}/products
Content-Type: application/json

{
  "name": "Camiseta Preta",
  "price": 5000,
  "original_price": 7000,
  "description": "Camiseta 100% algodão",
  "category_id": 5,
  "subcategory_id": 18,
  "stock": 50,
  "badge": "Novo",
  "images": [
    "https://exemplo.com/imagem1.jpg",
    "https://exemplo.com/imagem2.jpg"
  ]
}
```

**Resposta (201):**
```json
{
  "id": 456,
  "name": "Camiseta Preta",
  "slug": "camiseta-preta",
  "price": "5000.00",
  "stock": 50,
  ...
}
```

#### Actualizar Produto
```http
PUT /api/store-api/{slug}/products/{id}
Content-Type: application/json

{
  "price": 4500,
  "stock": 45
}
```

#### Eliminar Produto
```http
DELETE /api/store-api/{slug}/products/{id}
```

#### Listar Categorias
```http
GET /api/store-api/{slug}/categories
```

### 5.4 Limites

- Respeita o limite de produtos do plano
- Rate limiting configurável por loja
- Slug é gerado automaticamente a partir do nome

### 5.5 Erros Comuns

| Código | Significado |
|---|---|
| 401 | API key/secret inválidos ou em falta |
| 403 | API desactivada, loja não aprovada, ou plano sem API |
| 422 | Limite de produtos atingido ou dados inválidos |
| 404 | Produto/recurso não encontrado |

---

## 6. Autenticação de Utilizadores

```http
POST /api/auth/register
{
  "name": "João Silva",
  "email": "joao@email.com",
  "password": "senha123",
  "password_confirmation": "senha123"
}
```

```http
POST /api/auth/login
{
  "email": "joao@email.com",
  "password": "senha123"
}
→ Retorna: { "token": "1|abc123...", "user": { ... } }
```

```http
GET /api/auth/me
Authorization: Bearer 1|abc123...
→ Retorna dados do user + lojas que possui
```

---

## 7. Checkout e Encomendas

O checkout suporta carrinho multi-loja (comprar de várias lojas num só checkout).

```http
POST /api/checkout
{
  "items": [
    { "product_id": 123, "quantity": 2 },
    { "product_id": 456, "quantity": 1 }
  ],
  "customer": {
    "name": "Maria Santos",
    "email": "maria@email.com",
    "phone": "+244912345678",
    "address": "Rua dos Coqueiros, 45",
    "province": "Luanda",
    "notes": "Entregar de manhã"
  },
  "payment_methods": {
    "1": "transferencia",
    "3": "multicaixa_express"
  }
}
```

**Fluxo:**
1. Cliente adiciona produtos ao carrinho
2. No checkout, preenche dados e método de pagamento (por loja)
3. Pode anexar comprovativo de pagamento
4. Sistema cria encomenda separada para cada loja
5. Lojista recebe notificação e gere o pedido no painel
6. Cliente acompanha status no painel do cliente

**Status de encomenda:** `pending` → `confirmed` → `shipped` → `delivered` (ou `cancelled`)

---

## 8. Planos e Subscrições

| Recurso | Grátis | Básico | Pro | Premium |
|---|---|---|---|---|
| Produtos | 10 | 50 | 200 | Ilimitado |
| Imagens/produto | 3 | 5 | 10 | 15 |
| Hero slides | 1 | 3 | 5 | 10 |
| Categorias | 1 | 3 | 5 | Todas |
| Analytics | ❌ | ❌ | ✅ | ✅ |
| API externa | ❌ | ❌ | ✅ | ✅ |
| POS (Ponto de Venda) | ❌ | ❌ | ✅ | ✅ |
| Subdomínio | ❌ | ❌ | ❌ | ✅ |
| Suporte prioritário | ❌ | ❌ | ✅ | ✅ |

Os planos são configuráveis pelo admin. Lojas podem fazer upgrade/downgrade.

---

## 9. Funcionalidades da Loja (Painel)

O dono da loja acede em `/loja/{slug}/painel/` e pode:

- **Produtos** — CRUD completo, variantes (cor, tamanho), flash sale, badge, activar/desactivar, acções em massa
- **Encomendas** — Ver pedidos, alterar status, notificar cliente
- **Slides** — Banners personalizados da loja
- **Analytics** — Visitas, páginas mais vistas, geografia, referrers, dispositivos (planos Pro+)
- **POS** — Ponto de venda presencial com registo offline (planos Pro+)
- **API** — Gerar chaves, configurar permissões, documentação integrada
- **Definições** — Logo, banner, WhatsApp, horário, políticas, redes sociais, métodos de pagamento
- **Subscrição** — Ver plano actual, histórico, upgrade

---

## 10. Como Vender no SuperLoja

### Passo a passo:

1. **Registar conta** em https://superloja.vip/auth (ou `/registar-loja` directamente)
2. **Criar loja** — Nome, categoria, província, WhatsApp, descrição
3. **Aguardar aprovação** — Admin revê e aprova a loja
4. **Adicionar produtos** — Fotos, preço, stock, categoria, descrição
5. **Receber encomendas** — Notificação por email e no painel
6. **Gerir pedidos** — Confirmar, enviar, entregar
7. **Crescer** — Upgrade de plano para mais produtos, analytics, API

### Dicas para engajamento:

- **WhatsApp** — Principal canal de contacto em Angola; todos os produtos têm botão "Comprar no WhatsApp"
- **Flash Sales** — Criar promoções com temporizador gera urgência
- **Produtos em destaque** — Solicitar destaque para aparecer na homepage
- **Imagens de qualidade** — Primeira imagem é a de destaque
- **Variantes** — Adicionar cores, tamanhos aumenta conversão
- **Redes sociais** — Partilhar link da loja no Facebook, Instagram, TikTok

---

## 11. Lojas Principais

As lojas são dinâmicas e mudam conforme novos vendedores se registam. Lojas com selo "Oficial" (✓) são verificadas pelo admin.

Para ver as lojas actuais:
```http
GET /api/stores?per_page=50
GET /api/stores/featured        # Lojas em destaque
```

---

## 12. Integração para Agentes IA

### Caso de uso: Listar e recomendar produtos

```python
import requests

API = "https://superloja.vip/api"

# Buscar produtos de electrónica com stock
resp = requests.get(f"{API}/products", params={
    "category_id": 3,
    "in_stock": 1,
    "sort": "price",
    "dir": "asc",
    "per_page": 10
})
products = resp.json()["data"]

for p in products:
    print(f"{p['name']} — {p['price']} Kz — Loja: {p['store']['name']}")
```

### Caso de uso: Gerir produtos de uma loja via API

```python
import requests

STORE_SLUG = "minha-loja"
HEADERS = {
    "X-Api-Key": "sk_abc123...",
    "X-Api-Secret": "ss_xyz789...",
    "Content-Type": "application/json"
}
BASE = f"https://superloja.vip/api/store-api/{STORE_SLUG}"

# Listar produtos
products = requests.get(f"{BASE}/products", headers=HEADERS).json()

# Criar produto
new = requests.post(f"{BASE}/products", headers=HEADERS, json={
    "name": "Tênis Nike Air Max",
    "price": 35000,
    "stock": 20,
    "category_id": 5,
    "badge": "Novo",
    "images": ["https://cdn.exemplo.com/nike.jpg"]
})
print(new.json())

# Actualizar preço e stock
requests.put(f"{BASE}/products/{new.json()['id']}", headers=HEADERS, json={
    "price": 30000,
    "stock": 15
})

# Eliminar
requests.delete(f"{BASE}/products/{new.json()['id']}", headers=HEADERS)
```

### Caso de uso: Pesquisar produto para um cliente

```python
# Cliente pergunta: "Quero um telemóvel barato em Luanda"
resp = requests.get(f"{API}/products", params={
    "search": "telemóvel",
    "in_stock": 1,
    "max_price": 100000,
    "sort": "price",
    "dir": "asc",
    "per_page": 5
})

for p in resp.json()["data"]:
    store = p["store"]
    if store["province"] == "Luanda":
        print(f"✅ {p['name']} — {p['price']} Kz")
        print(f"   Loja: {store['name']} | WhatsApp: {store['whatsapp']}")
        print(f"   Link: https://superloja.vip/produto/{p['slug']}")
```

---

## 13. URLs Importantes

| Recurso | URL |
|---|---|
| **Site** | https://superloja.vip |
| **API Base** | https://superloja.vip/api |
| **Registar** | https://superloja.vip/auth |
| **Abrir Loja** | https://superloja.vip/registar-loja |
| **Categorias** | https://superloja.vip/categorias |
| **Lojas** | https://superloja.vip/lojas |
| **Flash Sale** | https://superloja.vip/flash-sale |
| **Contacto** | https://superloja.vip/contacto |
| **FAQ** | https://superloja.vip/faq |
| **Termos** | https://superloja.vip/termos |
| **Privacidade** | https://superloja.vip/privacidade |
| **Docs API** | https://superloja.vip/api-docs |

---

## 14. Campos do Produto (Referência Completa)

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | integer | ID único |
| `name` | string | Nome do produto |
| `slug` | string | URL amigável (único) |
| `price` | decimal | Preço actual (em Kz) |
| `original_price` | decimal\|null | Preço original (riscado se existir) |
| `currency` | string | Moeda ("Kz" ou "USD") |
| `stock` | integer | Quantidade em stock |
| `description` | string\|null | Descrição detalhada |
| `images` | array | Lista de URLs de imagens (1ª = destaque) |
| `category` | string | Nome da categoria (legacy) |
| `category_id` | integer\|null | ID da categoria |
| `subcategory_id` | integer\|null | ID da subcategoria |
| `badge` | string\|null | "Novo", "Usado", ou "Promo" |
| `rating` | decimal | Avaliação média (0.0 — 5.0) |
| `review_count` | integer | Número de avaliações |
| `variants` | array\|null | Variantes: `[{ type: "Cor", options: ["Preto","Branco"] }]` |
| `flash_sale_start` | datetime\|null | Início da promoção |
| `flash_sale_end` | datetime\|null | Fim da promoção |
| `is_featured` | boolean | Se é destaque |
| `featured_status` | string\|null | "pending", "approved", "rejected" |
| `is_active` | boolean | Se está visível |
| `store_id` | integer | ID da loja |
| `created_at` | datetime | Data de criação |
| `updated_at` | datetime | Última actualização |

---

## 15. Campos da Loja (Referência Completa)

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | integer | ID único |
| `name` | string | Nome da loja |
| `slug` | string | URL amigável |
| `description` | string\|null | Descrição da loja |
| `logo` | string | URL do logotipo |
| `banner` | string | URL do banner |
| `province` | string | Província (ex: Luanda) |
| `city` | string | Cidade |
| `whatsapp` | string | Número WhatsApp com código (+244...) |
| `email` | string\|null | Email da loja |
| `phone` | string\|null | Telefone |
| `categories` | array | IDs das categorias da loja |
| `socials` | object\|null | Redes sociais (facebook, instagram, tiktok...) |
| `payment_methods` | array\|null | Métodos aceites (transferência, Multicaixa Express...) |
| `business_hours` | object\|null | Horário de funcionamento |
| `rating` | decimal | Avaliação média |
| `review_count` | integer | Número de avaliações |
| `status` | string | "pending", "approved", "rejected", "banned" |
| `is_official` | boolean | Selo de loja verificada |
| `is_featured` | boolean | Se está em destaque |
| `plan_id` | integer\|null | Plano actual |

---

## 16. Províncias de Angola

Angola tem 18 províncias. As mais activas no marketplace são:
Luanda, Benguela, Huambo, Huíla, Cabinda, Lunda Norte, Lunda Sul, Malanje, Uíge, Zaire, Bengo, Bié, Cuando Cubango, Cunene, Kwanza Norte, Kwanza Sul, Moxico, Namibe.

```http
GET /api/provinces   # Retorna lista completa
```

---

## 17. Contacto e Suporte

- **Email:** Configurável nas settings do admin
- **WhatsApp:** Principal canal de suporte
- **Formulário:** https://superloja.vip/contacto

---

*Este documento serve como referência completa para agentes IA, desenvolvedores e parceiros que queiram integrar com o SuperLoja.*
