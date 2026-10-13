import { useState } from "react";
import { Link } from "react-router-dom";
import { Code2, ArrowLeft, Copy, Check, ChevronDown, Globe, ShoppingBag, Store, Tag, Zap, Star, Clock, Award, Key, Package, Users } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "https://superloja.vip/api";

interface Endpoint {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  desc: string;
  params?: { name: string; type: string; required?: boolean; desc: string }[];
  response?: string;
  auth?: boolean;
}

interface Section {
  title: string;
  icon: any;
  color: string;
  bg: string;
  desc: string;
  endpoints: Endpoint[];
}

const methodColors: Record<string, string> = {
  GET: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  POST: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  PUT: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  PATCH: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const sections: Section[] = [
  {
    title: "Lojas",
    icon: Store,
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    desc: "Endpoints para listar, pesquisar e visualizar lojas aprovadas na plataforma.",
    endpoints: [
      {
        method: "GET",
        path: "/stores",
        desc: "Lista todas as lojas aprovadas. Suporta filtros por provincia, pesquisa, categoria e ordenacao.",
        params: [
          { name: "province", type: "string", desc: "Filtrar por provincia (ex: Luanda)" },
          { name: "search", type: "string", desc: "Pesquisar por nome ou descricao" },
          { name: "category", type: "string", desc: "Filtrar por categoria (slug ou nome)" },
          { name: "sort", type: "string", desc: "Ordenar: newest (padrao), rating, name, products" },
        ],
        response: `[{
  "id": 6,
  "name": "SuperLoja Angola",
  "slug": "superloja",
  "description": "A sua loja online...",
  "logo": "/storage/stores/6/logos/superloja-logo.png",
  "banner": "/storage/stores/6/banners/superloja-banner.png",
  "province": "Luanda",
  "city": "Luanda",
  "whatsapp": "+244923000000",
  "rating": "4.5",
  "review_count": "12",
  "is_official": true,
  "is_featured": true,
  "has_subdomain": true,
  "product_count": 25,
  "follower_count": 150,
  "categories": ["electronica", "informatica"],
  "socials": { "instagram": "", "facebook": "" },
  "payment_methods": [...]
}]`,
      },
      {
        method: "GET",
        path: "/stores/featured",
        desc: "Lista as lojas em destaque (marcadas como featured pelo admin).",
        response: `// Mesmo formato de /stores, limitado a 8 lojas`,
      },
      {
        method: "GET",
        path: "/stores/{slug}",
        desc: "Detalhes completos de uma loja, incluindo todos os produtos e slides do hero.",
        params: [
          { name: "slug", type: "string", required: true, desc: "Slug unico da loja" },
        ],
        response: `{
  "id": 6,
  "name": "SuperLoja Angola",
  "slug": "superloja",
  // ...campos da loja...
  "products": [...],
  "hero_slides": [...]
}`,
      },
    ],
  },
  {
    title: "Produtos",
    icon: Package,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    desc: "Endpoints para listar, pesquisar, filtrar e visualizar produtos.",
    endpoints: [
      {
        method: "GET",
        path: "/products",
        desc: "Lista todos os produtos com filtros avancados, paginacao e ordenacao.",
        params: [
          { name: "category", type: "string", desc: "Filtrar por categoria" },
          { name: "category_id", type: "integer", desc: "Filtrar por ID da categoria" },
          { name: "subcategory_id", type: "integer", desc: "Filtrar por ID da subcategoria" },
          { name: "store", type: "string", desc: "Filtrar por slug da loja" },
          { name: "badge", type: "string", desc: "Filtrar por badge: Promo, Novo, Usado" },
          { name: "search", type: "string", desc: "Pesquisar por nome do produto" },
          { name: "min_price", type: "number", desc: "Preco minimo" },
          { name: "max_price", type: "number", desc: "Preco maximo" },
          { name: "sort", type: "string", desc: "Ordenar: newest, price_asc, price_desc, rating, name" },
          { name: "per_page", type: "integer", desc: "Itens por pagina (padrao: 20)" },
        ],
        response: `{
  "data": [{
    "id": 1,
    "name": "Cabo USB Tipo-C",
    "slug": "cabo-usb-tipo-c",
    "price": "3500.00",
    "original_price": "5000.00",
    "currency": "AOA",
    "images": ["/storage/stores/6/products/cabo-usb.jpg"],
    "store_id": "6",
    "category": "Electronica",
    "badge": "Promo",
    "rating": "4.5",
    "review_count": "8",
    "stock": "15",
    "description": "...",
    "variants": [],
    "flash_sale_start": "2026-03-01T00:00:00",
    "flash_sale_end": "2026-03-31T23:59:59",
    "is_featured": false,
    "featured_status": null,
    "store": { "id": 6, "name": "SuperLoja", ... }
  }],
  "current_page": 1,
  "last_page": 5,
  "total": 100
}`,
      },
      {
        method: "GET",
        path: "/products/trending",
        desc: "Retorna os 18 produtos em alta. O algoritmo considera avaliacao, numero de reviews e recencia.",
        response: `// Array de produtos ordenados por score (rating*2 + reviews + bonus recencia)`,
      },
      {
        method: "GET",
        path: "/products/latest",
        desc: "Retorna os 18 produtos mais recentes adicionados a plataforma.",
        response: `// Array de produtos com store incluido, ordenados por data de criacao`,
      },
      {
        method: "GET",
        path: "/products/featured",
        desc: "Retorna os produtos em destaque (aprovados pelo admin).",
        response: `// Array de produtos com is_featured=true e featured_status=approved`,
      },
      {
        method: "GET",
        path: "/products/flash-sale",
        desc: "Retorna produtos em promocao relampago (badge Promo com data de fim valida).",
        response: `// Array de produtos com badge Promo e flash_sale_end no futuro`,
      },
      {
        method: "GET",
        path: "/products/{slug}",
        desc: "Detalhes completos de um produto, incluindo loja, categoria e subcategoria.",
        params: [
          { name: "slug", type: "string", required: true, desc: "Slug unico do produto" },
        ],
      },
    ],
  },
  {
    title: "Categorias",
    icon: Tag,
    color: "text-violet-500",
    bg: "bg-violet-50 dark:bg-violet-900/20",
    desc: "Endpoints para listar categorias e subcategorias da plataforma.",
    endpoints: [
      {
        method: "GET",
        path: "/categories",
        desc: "Lista todas as categorias com contagem de produtos e subcategorias.",
        response: `[{
  "id": 1,
  "name": "Electronica",
  "slug": "electronica",
  "icon": "Smartphone",
  "product_count": 45,
  "subcategories": [{
    "id": 1,
    "name": "Cabos e Adaptadores",
    "slug": "cabos-e-adaptadores",
    "product_count": 12
  }]
}]`,
      },
      {
        method: "GET",
        path: "/categories/{slug}",
        desc: "Detalhes de uma categoria especifica com suas subcategorias.",
        params: [
          { name: "slug", type: "string", required: true, desc: "Slug da categoria" },
        ],
      },
    ],
  },
  {
    title: "Avaliacoes",
    icon: Star,
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    desc: "Endpoints para ler e submeter avaliacoes de lojas.",
    endpoints: [
      {
        method: "GET",
        path: "/reviews",
        desc: "Lista avaliacoes. Pode filtrar por loja.",
        params: [
          { name: "store_id", type: "integer", desc: "Filtrar por ID da loja" },
        ],
      },
      {
        method: "POST",
        path: "/reviews",
        desc: "Submeter uma avaliacao para uma loja.",
        auth: true,
        params: [
          { name: "store_id", type: "integer", required: true, desc: "ID da loja" },
          { name: "rating", type: "integer", required: true, desc: "Nota de 1 a 5" },
          { name: "comment", type: "string", desc: "Comentario da avaliacao" },
        ],
      },
    ],
  },
  {
    title: "Autenticacao",
    icon: Key,
    color: "text-red-500",
    bg: "bg-red-50 dark:bg-red-900/20",
    desc: "Endpoints para registo, login e gestao de conta. Utiliza Laravel Sanctum (Bearer Token).",
    endpoints: [
      {
        method: "POST",
        path: "/auth/register",
        desc: "Criar nova conta de utilizador.",
        params: [
          { name: "name", type: "string", required: true, desc: "Nome completo" },
          { name: "email", type: "string", required: true, desc: "Email (unico)" },
          { name: "password", type: "string", required: true, desc: "Senha (min 6 caracteres)" },
          { name: "password_confirmation", type: "string", required: true, desc: "Confirmacao da senha" },
        ],
        response: `{
  "token": "1|abc123...",
  "user": { "id": 1, "name": "Joao", "email": "joao@email.com", "role": "client" }
}`,
      },
      {
        method: "POST",
        path: "/auth/login",
        desc: "Autenticar com email e senha.",
        params: [
          { name: "email", type: "string", required: true, desc: "Email do utilizador" },
          { name: "password", type: "string", required: true, desc: "Senha" },
        ],
        response: `{
  "token": "2|xyz789...",
  "user": { "id": 1, "name": "Joao", "email": "joao@email.com", "role": "client" }
}`,
      },
      {
        method: "GET",
        path: "/auth/me",
        desc: "Retorna os dados do utilizador autenticado.",
        auth: true,
      },
      {
        method: "POST",
        path: "/auth/logout",
        desc: "Revogar o token actual.",
        auth: true,
      },
      {
        method: "POST",
        path: "/auth/forgot-password",
        desc: "Enviar email de recuperacao de senha.",
        params: [
          { name: "email", type: "string", required: true, desc: "Email do utilizador" },
        ],
      },
    ],
  },
  {
    title: "Registo de Loja",
    icon: ShoppingBag,
    color: "text-orange-500",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    desc: "Endpoint para registar uma nova loja na plataforma. Pode criar conta e loja em simultâneo.",
    endpoints: [
      {
        method: "POST",
        path: "/stores/register-guest",
        desc: "Registar loja sem estar autenticado (cria conta automaticamente).",
        params: [
          { name: "name", type: "string", required: true, desc: "Nome da loja" },
          { name: "description", type: "string", required: true, desc: "Descricao da loja" },
          { name: "logo", type: "file", required: true, desc: "Logo da loja (imagem, max 6MB)" },
          { name: "banner", type: "file", desc: "Banner da loja (imagem, max 6MB)" },
          { name: "province", type: "string", required: true, desc: "Provincia" },
          { name: "city", type: "string", required: true, desc: "Cidade" },
          { name: "municipality", type: "string", desc: "Municipio" },
          { name: "address", type: "string", desc: "Endereco (max 500)" },
          { name: "whatsapp", type: "string", required: true, desc: "Numero de WhatsApp" },
          { name: "category", type: "string", required: true, desc: "Categoria principal" },
          { name: "user_name", type: "string", required: true, desc: "Nome do proprietario" },
          { name: "user_email", type: "string", required: true, desc: "Email (para criar conta)" },
          { name: "user_password", type: "string", required: true, desc: "Senha (min 6 caracteres)" },
        ],
        response: `{
  "message": "Loja registada com sucesso!",
  "store": { ... },
  "auto_approved": false,
  "token": "3|token...",
  "user": { ... }
}`,
      },
      {
        method: "POST",
        path: "/stores/register",
        desc: "Registar loja estando autenticado (associa a conta existente).",
        auth: true,
        params: [
          { name: "name", type: "string", required: true, desc: "Nome da loja" },
          { name: "description", type: "string", required: true, desc: "Descricao da loja" },
          { name: "logo", type: "file", required: true, desc: "Logo da loja" },
          { name: "province", type: "string", required: true, desc: "Provincia" },
          { name: "city", type: "string", required: true, desc: "Cidade" },
          { name: "whatsapp", type: "string", required: true, desc: "Numero de WhatsApp" },
          { name: "category", type: "string", required: true, desc: "Categoria principal" },
          { name: "user_name", type: "string", required: true, desc: "Nome do proprietario" },
        ],
      },
    ],
  },
  {
    title: "Seguir Lojas",
    icon: Users,
    color: "text-pink-500",
    bg: "bg-pink-50 dark:bg-pink-900/20",
    desc: "Endpoints para seguir/deixar de seguir lojas e ver o feed de novidades.",
    endpoints: [
      {
        method: "POST",
        path: "/client/follow/{store_id}",
        desc: "Seguir uma loja.",
        auth: true,
      },
      {
        method: "DELETE",
        path: "/client/follow/{store_id}",
        desc: "Deixar de seguir uma loja.",
        auth: true,
      },
      {
        method: "GET",
        path: "/client/follow/{store_id}/status",
        desc: "Verificar se o utilizador segue uma loja.",
        auth: true,
        response: `{ "following": true, "follower_count": 42 }`,
      },
      {
        method: "GET",
        path: "/client/following",
        desc: "Listar todas as lojas que o utilizador segue.",
        auth: true,
      },
      {
        method: "GET",
        path: "/client/feed",
        desc: "Feed de produtos recentes das lojas seguidas.",
        auth: true,
      },
    ],
  },
  {
    title: "Outros",
    icon: Globe,
    color: "text-cyan-500",
    bg: "bg-cyan-50 dark:bg-cyan-900/20",
    desc: "Endpoints auxiliares da plataforma.",
    endpoints: [
      {
        method: "GET",
        path: "/provinces",
        desc: "Lista todas as provincias de Angola disponiveis.",
      },
      {
        method: "GET",
        path: "/site-settings",
        desc: "Retorna configuracoes publicas do site (nome, logo, cores, redes sociais, etc).",
      },
      {
        method: "GET",
        path: "/hero-slides",
        desc: "Slides do hero da homepage.",
      },
      {
        method: "GET",
        path: "/hero-slides/store/{slug}",
        desc: "Slides do hero de uma loja especifica.",
        params: [
          { name: "slug", type: "string", required: true, desc: "Slug da loja" },
        ],
      },
      {
        method: "POST",
        path: "/contact",
        desc: "Enviar mensagem de contacto.",
        params: [
          { name: "name", type: "string", required: true, desc: "Nome" },
          { name: "email", type: "string", required: true, desc: "Email" },
          { name: "subject", type: "string", required: true, desc: "Assunto" },
          { name: "message", type: "string", required: true, desc: "Mensagem" },
        ],
      },
      {
        method: "POST",
        path: "/track",
        desc: "Registar visita a uma pagina (analytics).",
        params: [
          { name: "url", type: "string", required: true, desc: "URL da pagina visitada" },
          { name: "referrer", type: "string", desc: "URL de referencia" },
        ],
      },
    ],
  },
  {
    title: "API Externa da Loja",
    icon: Zap,
    color: "text-indigo-500",
    bg: "bg-indigo-50 dark:bg-indigo-900/20",
    desc: "API autenticada por API Key para integracao externa. Requer activacao no painel da loja (planos avancados).",
    endpoints: [
      {
        method: "GET",
        path: "/store-api/{slug}",
        desc: "Informacoes da loja.",
        auth: true,
      },
      {
        method: "GET",
        path: "/store-api/{slug}/products",
        desc: "Listar produtos da loja.",
        auth: true,
      },
      {
        method: "GET",
        path: "/store-api/{slug}/products/{id}",
        desc: "Detalhes de um produto.",
        auth: true,
      },
      {
        method: "POST",
        path: "/store-api/{slug}/products",
        desc: "Criar um novo produto.",
        auth: true,
      },
      {
        method: "PUT",
        path: "/store-api/{slug}/products/{id}",
        desc: "Actualizar um produto.",
        auth: true,
      },
      {
        method: "DELETE",
        path: "/store-api/{slug}/products/{id}",
        desc: "Remover um produto.",
        auth: true,
      },
      {
        method: "GET",
        path: "/store-api/{slug}/categories",
        desc: "Categorias da loja.",
        auth: true,
      },
    ],
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1 rounded hover:bg-secondary transition-colors"
      title="Copiar"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
    </button>
  );
}

function EndpointCard({ ep }: { ep: Endpoint }) {
  const [open, setOpen] = useState(false);
  const fullUrl = `${API_BASE}${ep.path}`;

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition-colors">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${methodColors[ep.method]}`}>{ep.method}</span>
        <code className="text-xs font-mono text-foreground flex-1 truncate">{ep.path}</code>
        {ep.auth && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shrink-0">AUTH</span>}
        <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border">
          <p className="text-sm text-muted-foreground">{ep.desc}</p>

          <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2">
            <code className="text-[11px] font-mono text-foreground flex-1 truncate">{fullUrl}</code>
            <CopyButton text={fullUrl} />
          </div>

          {ep.auth && (
            <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <Key className="h-3 w-3" /> Requer header: <code className="bg-secondary px-1.5 py-0.5 rounded font-mono text-[10px]">Authorization: Bearer {"<token>"}</code>
            </div>
          )}

          {ep.params && ep.params.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Parametros</p>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-secondary/50">
                      <th className="text-left px-3 py-1.5 font-semibold">Nome</th>
                      <th className="text-left px-3 py-1.5 font-semibold">Tipo</th>
                      <th className="text-left px-3 py-1.5 font-semibold hidden sm:table-cell">Descricao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ep.params.map((p) => (
                      <tr key={p.name} className="border-t border-border">
                        <td className="px-3 py-1.5 font-mono">
                          {p.name}
                          {p.required && <span className="text-destructive ml-1">*</span>}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">{p.type}</td>
                        <td className="px-3 py-1.5 text-muted-foreground hidden sm:table-cell">{p.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {ep.response && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Exemplo de Resposta</p>
              <div className="relative rounded-lg bg-[#1e1e2e] p-3 overflow-x-auto">
                <pre className="text-[11px] font-mono text-emerald-300 leading-relaxed whitespace-pre">{ep.response}</pre>
                <div className="absolute top-2 right-2">
                  <CopyButton text={ep.response} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ApiDocs() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <main className="min-h-screen bg-secondary/30">
      {/* Hero */}
      <div className="bg-hero-gradient py-12 sm:py-16">
        <div className="container text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-11 w-11 rounded-xl bg-card/20 backdrop-blur flex items-center justify-center">
              <Code2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-primary-foreground">Documentacao da API</h1>
          </div>
          <p className="text-primary-foreground/80 text-sm max-w-lg mx-auto">
            Referencia completa da API REST do SuperLojas. Base URL:
          </p>
          <div className="inline-flex items-center gap-2 mt-3 rounded-xl bg-card/10 backdrop-blur px-4 py-2">
            <code className="text-xs font-mono text-primary-foreground">{API_BASE}</code>
            <CopyButton text={API_BASE} />
          </div>
        </div>
      </div>

      <div className="container py-10 max-w-5xl">
        {/* Intro cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {[
            { title: "Formato", desc: "Todas as respostas sao em JSON. Enviar Content-Type: application/json para POST/PUT.", icon: "{ }" },
            { title: "Autenticacao", desc: "Endpoints protegidos usam Laravel Sanctum. Enviar header Authorization: Bearer <token>.", icon: "🔑" },
            { title: "Erros", desc: "Erros retornam status HTTP adequado (400, 401, 403, 404, 422, 500) com mensagem.", icon: "⚠️" },
          ].map((c) => (
            <div key={c.title} className="rounded-xl border border-border bg-card p-4">
              <span className="text-lg mb-1 block">{c.icon}</span>
              <h3 className="text-sm font-bold mb-1">{c.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>

        {/* Section tabs */}
        <div className="flex gap-2 flex-wrap mb-6">
          {sections.map((sec, i) => (
            <button key={i} onClick={() => setActiveTab(i)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === i
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}>
              <sec.icon className={`h-3.5 w-3.5 ${activeTab === i ? "text-primary-foreground" : sec.color}`} />
              {sec.title}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === i ? "bg-white/20 text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                {sec.endpoints.length}
              </span>
            </button>
          ))}
        </div>

        {/* Active section */}
        <div className="rounded-2xl bg-card border border-border p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className={`h-10 w-10 rounded-xl ${sections[activeTab].bg} flex items-center justify-center`}>
              {(() => { const Icon = sections[activeTab].icon; return <Icon className={`h-5 w-5 ${sections[activeTab].color}`} />; })()}
            </div>
            <div>
              <h2 className="text-sm font-bold">{sections[activeTab].title}</h2>
              <p className="text-[11px] text-muted-foreground">{sections[activeTab].endpoints.length} endpoints</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-4">{sections[activeTab].desc}</p>
          <div className="space-y-2">
            {sections[activeTab].endpoints.map((ep, i) => (
              <EndpointCard key={i} ep={ep} />
            ))}
          </div>
        </div>

        {/* Store External API note */}
        <div className="mt-8 rounded-2xl bg-card border border-border p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center shrink-0">
              <Zap className="h-6 w-6 text-indigo-500" />
            </div>
            <div>
              <h3 className="font-bold mb-1">API Externa para Lojas</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Lojas com planos avancados podem activar a API externa no painel da loja. 
                Isto permite integracao com sistemas externos (ERP, apps mobile, etc.) usando 
                chaves de API dedicadas.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A autenticacao e feita via headers <code className="bg-secondary px-1.5 py-0.5 rounded text-xs font-mono">X-API-Key</code> e <code className="bg-secondary px-1.5 py-0.5 rounded text-xs font-mono">X-API-Secret</code>.
                Gere as suas chaves no Painel da Loja → Configuracoes API.
              </p>
            </div>
          </div>
        </div>

        {/* Rate limiting */}
        <div className="mt-4 rounded-2xl bg-card border border-border p-6">
          <h3 className="font-bold mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" /> Rate Limiting
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A API publica tem limite de <strong>60 requisicoes por minuto</strong> por IP. 
            A API externa das lojas tem limite configuravel (padrao: 60/min). 
            Ao exceder o limite, recebera resposta <code className="bg-secondary px-1.5 py-0.5 rounded text-xs font-mono">429 Too Many Requests</code>.
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Voltar ao inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
