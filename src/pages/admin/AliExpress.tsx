import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import { useEffect, useState, useCallback, type ReactNode } from "react";
import {
  ShoppingCart, Loader2, Link2, Sparkles, CheckCircle2, AlertTriangle,
  Package, Truck, RefreshCw, Trash2, Save, Search, KeyRound, HelpCircle,
  ChevronDown, ExternalLink,
} from "lucide-react";
import { useToastNotification } from "@/contexts/ToastContext";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

interface Status {
  aliexpress_configured: boolean;
  ai_configured: boolean;
  ship_to: string;
  currency: string;
  ai_model: string;
}

interface Draft {
  ae_product_id?: string;
  ae_source_url?: string;
  name?: string | null;
  description?: string | null;
  images?: string[];
  ae_cost?: number | null;
  ae_currency?: string;
  suggested_price?: number | null;
  category_id?: number | null;
  subcategory_id?: number | null;
  meta_title?: string;
  meta_description?: string;
}

interface SupplierOrder {
  id: number;
  status: string;
  ae_order_id: string | null;
  tracking_number: string | null;
  carrier: string | null;
  cost: string | null;
  cost_currency: string;
  sale_total: string | null;
  sale_currency: string;
  order?: { order_number: string; customer_name: string; total: string } | null;
  store?: { name: string; slug: string } | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "gray", placed: "blue", shipped: "amber", delivered: "green", cancelled: "red",
};
const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho", placed: "Encomendado", shipped: "Enviado", delivered: "Entregue", cancelled: "Cancelado",
};

export default function AdminAliExpress() {
  const { token } = useAuth();
  const s = useAdminStyles();
  const toast = useToastNotification();
  const hdrs: Record<string, string> = {
    Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json",
  };

  const [status, setStatus] = useState<Status | null>(null);
  const [url, setUrl] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftFlags, setDraftFlags] = useState<{ needs_keys?: boolean; ai_applied?: boolean; ai_error?: string | null; scrape_note?: string }>({});

  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Record<number, Partial<SupplierOrder>>>({});

  // Config form
  const [cfg, setCfg] = useState({
    aliexpress_app_key: "", aliexpress_app_secret: "", aliexpress_access_token: "",
    aliexpress_ship_to: "AO", aliexpress_currency: "USD", aliexpress_scrape_enabled: true,
    aliexpress_usd_to_aoa: "", aliexpress_margin_pct: "",
    ai_base_url: "", ai_api_key: "", ai_model: "gpt-4o-mini",
    hermes_webhook_url: "", hermes_webhook_secret: "",
  });
  const [cfgMeta, setCfgMeta] = useState<{ app_secret_preview?: string | null; api_key_preview?: string | null; access_token_set?: boolean; webhook_secret_set?: boolean }>({});
  const [savingCfg, setSavingCfg] = useState(false);
  const [showHelper, setShowHelper] = useState(false);

  // Import queue (SuperLojas -> Hermes)
  const [stores, setStores] = useState<{ id: number; name: string; slug: string }[]>([]);
  const [enqStore, setEnqStore] = useState("");
  const [enqUrls, setEnqUrls] = useState("");
  const [enqueuing, setEnqueuing] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);

  const loadStores = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin/stores?per_page=100`, { headers: hdrs });
      const d = await res.json();
      setStores(d.data ?? d ?? []);
    } catch { /* ignore */ }
  }, [token]);

  const loadJobs = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin/aliexpress/import-jobs`, { headers: hdrs });
      const d = await res.json();
      setJobs(d.data ?? d ?? []);
    } catch { /* ignore */ }
  }, [token]);

  const doEnqueue = async () => {
    const urls = enqUrls.split("\n").map((u) => u.trim()).filter(Boolean);
    if (!enqStore) { toast.error("Escolha a loja"); return; }
    if (urls.length === 0) { toast.error("Cole ao menos uma URL"); return; }
    setEnqueuing(true);
    try {
      const res = await fetch(`${API}/admin/aliexpress/import-jobs`, {
        method: "POST", headers: hdrs, body: JSON.stringify({ store_id: Number(enqStore), urls }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error || "Erro ao enfileirar"); return; }
      toast.success(d.message || "Enviado para a fila");
      setEnqUrls("");
      loadJobs();
    } catch { toast.error("Erro de rede"); }
    finally { setEnqueuing(false); }
  };

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin/aliexpress/config`, { headers: hdrs });
      if (!res.ok) return;
      const d = await res.json();
      setCfg((c) => ({
        ...c,
        aliexpress_app_key: d.aliexpress?.app_key || "",
        aliexpress_ship_to: d.aliexpress?.ship_to || "AO",
        aliexpress_currency: d.aliexpress?.currency || "USD",
        aliexpress_scrape_enabled: !!d.aliexpress?.scrape_enabled,
        aliexpress_usd_to_aoa: d.aliexpress?.usd_to_aoa ? String(d.aliexpress.usd_to_aoa) : "",
        aliexpress_margin_pct: d.aliexpress?.margin_pct ? String(d.aliexpress.margin_pct) : "",
        ai_base_url: d.ai?.base_url || "",
        ai_model: d.ai?.model || "gpt-4o-mini",
        hermes_webhook_url: d.hermes?.webhook_url || "",
      }));
      setCfgMeta({
        app_secret_preview: d.aliexpress?.app_secret_preview,
        api_key_preview: d.ai?.api_key_preview,
        access_token_set: d.aliexpress?.access_token_set,
        webhook_secret_set: d.hermes?.webhook_secret_set,
      });
    } catch { /* ignore */ }
  }, [token]);

  const saveConfig = async () => {
    setSavingCfg(true);
    try {
      const res = await fetch(`${API}/admin/aliexpress/config`, {
        method: "PUT", headers: hdrs, body: JSON.stringify(cfg),
      });
      if (!res.ok) throw new Error();
      toast.success("Configuracoes guardadas");
      setCfg((c) => ({ ...c, aliexpress_app_secret: "", aliexpress_access_token: "", ai_api_key: "", hermes_webhook_secret: "" }));
      loadStatus(); loadConfig();
    } catch { toast.error("Erro ao guardar"); }
    finally { setSavingCfg(false); }
  };

  const testWebhook = async () => {
    try {
      const res = await fetch(`${API}/admin/aliexpress/webhook-test`, { method: "POST", headers: hdrs });
      const d = await res.json();
      if (d.ok) toast.success(`Webhook OK (HTTP ${d.status})`);
      else toast.error(d.error || `Falhou (HTTP ${d.status ?? "?"})`);
    } catch { toast.error("Erro ao testar webhook"); }
  };

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin/aliexpress/status`, { headers: hdrs });
      if (res.ok) setStatus(await res.json());
    } catch { /* ignore */ }
  }, [token]);

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (search) params.set("search", search);
      const res = await fetch(`${API}/admin/supplier-orders?${params}`, { headers: hdrs });
      const data = await res.json();
      setOrders(data.data ?? data ?? []);
    } catch { toast.error("Erro ao carregar encomendas"); }
    finally { setLoadingOrders(false); }
  }, [token, statusFilter, search]);

  useEffect(() => { loadStatus(); }, [loadStatus]);
  useEffect(() => { loadConfig(); }, [loadConfig]);
  useEffect(() => { loadStores(); loadJobs(); }, [loadStores, loadJobs]);
  useEffect(() => { loadOrders(); }, [loadOrders]);

  const doPreview = async () => {
    if (!url.trim()) { toast.error("Cole uma URL ou ID do AliExpress"); return; }
    setPreviewing(true); setDraft(null); setDraftFlags({});
    try {
      const res = await fetch(`${API}/admin/aliexpress/preview`, {
        method: "POST", headers: hdrs, body: JSON.stringify({ url: url.trim(), enrich: true }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Falha na importacao"); return; }
      setDraft(data.draft);
      setDraftFlags({
        needs_keys: data.needs_aliexpress_keys, ai_applied: data.ai_applied,
        ai_error: data.ai_error, scrape_note: data.draft?.scrape_note,
      });
      toast.success("Rascunho gerado");
    } catch { toast.error("Erro de rede"); }
    finally { setPreviewing(false); }
  };

  const saveOrder = async (id: number) => {
    const changes = editing[id];
    if (!changes) return;
    try {
      const res = await fetch(`${API}/admin/supplier-orders/${id}`, {
        method: "PUT", headers: hdrs, body: JSON.stringify(changes),
      });
      if (!res.ok) throw new Error();
      toast.success("Encomenda actualizada");
      setEditing((e) => { const n = { ...e }; delete n[id]; return n; });
      loadOrders();
    } catch { toast.error("Erro ao guardar"); }
  };

  const deleteOrder = async (id: number) => {
    if (!confirm("Remover esta encomenda de fornecedor?")) return;
    try {
      const res = await fetch(`${API}/admin/supplier-orders/${id}`, { method: "DELETE", headers: hdrs });
      if (!res.ok) throw new Error();
      toast.success("Removida");
      loadOrders();
    } catch { toast.error("Erro ao remover"); }
  };

  const edit = (id: number, field: keyof SupplierOrder, value: string) =>
    setEditing((e) => ({ ...e, [id]: { ...e[id], [field]: value } }));

  const testApiFn = async () => {
    try {
      const res = await fetch(`${API}/admin/aliexpress/test`, { headers: hdrs });
      const d = await res.json();
      if (d.ok) toast.success(d.message || "API OK"); else toast.error(d.message || "Falhou");
    } catch { toast.error("Erro ao testar API"); }
  };

  const syncOrder = async (id: number) => {
    try {
      const res = await fetch(`${API}/admin/supplier-orders/${id}/sync`, { method: "POST", headers: hdrs });
      const d = await res.json();
      if (!res.ok || d.ok === false) { toast.error(d.error || "Falha ao sincronizar"); return; }
      toast.success("Rastreio sincronizado"); loadOrders();
    } catch { toast.error("Erro de rede"); }
  };

  const placeOrder = async (id: number) => {
    if (!confirm("Encomendar este produto no AliExpress? Esta ação GASTA DINHEIRO (paga o fornecedor).")) return;
    try {
      const res = await fetch(`${API}/admin/supplier-orders/${id}/place`, { method: "POST", headers: hdrs });
      const d = await res.json();
      if (!res.ok || d.ok === false) { toast.error(d.error || "Falha ao encomendar"); return; }
      toast.success("Encomenda feita no AliExpress"); loadOrders();
    } catch { toast.error("Erro de rede"); }
  };

  const margin = (o: SupplierOrder) => {
    if (o.sale_total == null || o.cost == null) return null;
    return (parseFloat(o.sale_total) - parseFloat(o.cost)).toFixed(2);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShoppingCart className="w-6 h-6 text-orange-500" />
        <h1 className={`text-xl font-bold ${s.textPrimary}`}>AliExpress</h1>
      </div>

      {/* Status */}
      {status && (
        <div className={`rounded-2xl border p-4 ${s.card} flex flex-wrap gap-4 text-sm`}>
          <StatusPill ok={status.aliexpress_configured} label="API AliExpress" s={s} />
          <StatusPill ok={status.ai_configured} label={`IA (${status.ai_model})`} s={s} />
          <span className={s.textSecondary}>Envio para: <b className={s.textPrimary}>{status.ship_to}</b></span>
          <span className={s.textSecondary}>Moeda: <b className={s.textPrimary}>{status.currency}</b></span>
          <button onClick={testApiFn} className={`ml-auto text-xs px-2.5 py-1 rounded-lg ${s.btnSecondary}`}>Testar API oficial</button>
        </div>
      )}

      {/* Configuration */}
      <div className={`rounded-2xl border p-5 ${s.card} space-y-4`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-orange-500" />
            <h2 className={`font-semibold ${s.textPrimary}`}>Credenciais (guardadas na base de dados)</h2>
          </div>
          <button onClick={() => setShowHelper((v) => !v)}
            className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg ${s.btnSecondary}`}>
            <HelpCircle className="w-3.5 h-3.5" /> Como obter a API do AliExpress
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHelper ? "rotate-180" : ""}`} />
          </button>
        </div>

        {showHelper && (
          <div className={`rounded-xl border ${s.border} p-4 text-sm ${s.textSecondary} space-y-2`}>
            <p className={`font-medium ${s.textPrimary}`}>Passo a passo para obter App Key e App Secret:</p>
            <ol className="list-decimal ml-5 space-y-1.5">
              <li>Abra o <a href="https://openservice.aliexpress.com" target="_blank" rel="noreferrer" className="text-orange-500 inline-flex items-center gap-1">AliExpress Open Platform <ExternalLink className="w-3 h-3" /></a> e registe-se / inicie sessão.</li>
              <li>Candidate-se ao programa <b>Dropshipping</b> (para importar produtos e encomendar) ou <b>Affiliate/Portals</b> (para procurar preços e ganhar comissão).</li>
              <li>Em <b>Console → App Management</b>, crie uma aplicação (App). Descreva o uso: "importar produtos para um marketplace".</li>
              <li>Após aprovação, o App mostra a <b>App Key</b> e o <b>App Secret</b> — copie ambos para os campos abaixo.</li>
              <li>Para <b>encomendar</b> automaticamente (APIs de pedido), gere também um <b>Access Token</b> via OAuth e cole no campo respectivo.</li>
              <li>Guarde. O sistema passa a usar a API oficial automaticamente (deixa de depender do scraping).</li>
            </ol>
            <p className={`text-xs ${s.textMuted}`}>Sem chaves, o sistema continua a funcionar via scraping + bridge do Hermes, mas de forma menos fiável.</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {/* AliExpress */}
          <div className="space-y-3">
            <div className={`text-xs font-semibold uppercase tracking-wide ${s.textMuted}`}>AliExpress</div>
            <Field label="App Key" s={s}>
              <input value={cfg.aliexpress_app_key} onChange={(e) => setCfg({ ...cfg, aliexpress_app_key: e.target.value })}
                placeholder="App Key" className={`w-full px-3 py-2 rounded-xl border text-sm ${s.input}`} />
            </Field>
            <Field label="App Secret" s={s}>
              <input type="password" value={cfg.aliexpress_app_secret} onChange={(e) => setCfg({ ...cfg, aliexpress_app_secret: e.target.value })}
                placeholder={cfgMeta.app_secret_preview || "App Secret"} className={`w-full px-3 py-2 rounded-xl border text-sm ${s.input}`} />
            </Field>
            <Field label="Access Token (OAuth, p/ encomendar)" s={s}>
              <input type="password" value={cfg.aliexpress_access_token} onChange={(e) => setCfg({ ...cfg, aliexpress_access_token: e.target.value })}
                placeholder={cfgMeta.access_token_set ? "•••••• (definido)" : "opcional"} className={`w-full px-3 py-2 rounded-xl border text-sm ${s.input}`} />
            </Field>
            <div className="flex gap-3">
              <Field label="Envio p/" s={s}>
                <input value={cfg.aliexpress_ship_to} onChange={(e) => setCfg({ ...cfg, aliexpress_ship_to: e.target.value })}
                  className={`w-20 px-3 py-2 rounded-xl border text-sm ${s.input}`} />
              </Field>
              <Field label="Moeda" s={s}>
                <input value={cfg.aliexpress_currency} onChange={(e) => setCfg({ ...cfg, aliexpress_currency: e.target.value })}
                  className={`w-24 px-3 py-2 rounded-xl border text-sm ${s.input}`} />
              </Field>
            </div>
            <div className="flex gap-3">
              <Field label="Taxa USD→Kz" s={s}>
                <input type="number" step="0.01" value={cfg.aliexpress_usd_to_aoa}
                  onChange={(e) => setCfg({ ...cfg, aliexpress_usd_to_aoa: e.target.value })}
                  placeholder="ex: 830" className={`w-28 px-3 py-2 rounded-xl border text-sm ${s.input}`} />
              </Field>
              <Field label="Margem %" s={s}>
                <input type="number" step="1" value={cfg.aliexpress_margin_pct}
                  onChange={(e) => setCfg({ ...cfg, aliexpress_margin_pct: e.target.value })}
                  placeholder="ex: 40" className={`w-24 px-3 py-2 rounded-xl border text-sm ${s.input}`} />
              </Field>
            </div>
            <p className={`text-xs ${s.textMuted}`}>Usado para sugerir o preço de venda automaticamente a partir do custo em USD.</p>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={cfg.aliexpress_scrape_enabled}
                onChange={(e) => setCfg({ ...cfg, aliexpress_scrape_enabled: e.target.checked })} />
              <span className={s.textSecondary}>Permitir scraping como fallback</span>
            </label>
          </div>

          {/* AI */}
          <div className="space-y-3">
            <div className={`text-xs font-semibold uppercase tracking-wide ${s.textMuted}`}>IA (aisa one / OpenAI-compatível)</div>
            <Field label="Base URL" s={s}>
              <input value={cfg.ai_base_url} onChange={(e) => setCfg({ ...cfg, ai_base_url: e.target.value })}
                placeholder="https://api.exemplo.com/v1" className={`w-full px-3 py-2 rounded-xl border text-sm ${s.input}`} />
            </Field>
            <Field label="API Key" s={s}>
              <input type="password" value={cfg.ai_api_key} onChange={(e) => setCfg({ ...cfg, ai_api_key: e.target.value })}
                placeholder={cfgMeta.api_key_preview || "API Key"} className={`w-full px-3 py-2 rounded-xl border text-sm ${s.input}`} />
            </Field>
            <Field label="Modelo" s={s}>
              <input value={cfg.ai_model} onChange={(e) => setCfg({ ...cfg, ai_model: e.target.value })}
                placeholder="gpt-4o-mini" className={`w-full px-3 py-2 rounded-xl border text-sm ${s.input}`} />
            </Field>
          </div>

          {/* Hermes webhook (push) */}
          <div className="space-y-3 md:col-span-2 pt-2 border-t border-dashed">
            <div className={`text-xs font-semibold uppercase tracking-wide ${s.textMuted}`}>Webhook do Hermes (push — opcional)</div>
            <p className={`text-xs ${s.textMuted}`}>
              Se preenchido, ao enfileirar uma URL o SuperLojas faz POST assinado para este endereço (o Hermes não precisa fazer polling). Deixe vazio para usar apenas a fila (polling).
            </p>
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="URL do webhook do Hermes" s={s}>
                <input value={cfg.hermes_webhook_url} onChange={(e) => setCfg({ ...cfg, hermes_webhook_url: e.target.value })}
                  placeholder="https://hermes.exemplo.com/superloja-webhook" className={`w-full px-3 py-2 rounded-xl border text-sm ${s.input}`} />
              </Field>
              <Field label="Secret partilhado (assina o POST)" s={s}>
                <input type="password" value={cfg.hermes_webhook_secret} onChange={(e) => setCfg({ ...cfg, hermes_webhook_secret: e.target.value })}
                  placeholder={cfgMeta.webhook_secret_set ? "•••••• (definido)" : "opcional"} className={`w-full px-3 py-2 rounded-xl border text-sm ${s.input}`} />
              </Field>
            </div>
            <button onClick={testWebhook} type="button"
              className={`text-xs px-3 py-1.5 rounded-lg ${s.btnSecondary}`}>Testar webhook (enviar ping)</button>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={saveConfig} disabled={savingCfg}
            className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 ${s.btnPrimary} disabled:opacity-50`}>
            {savingCfg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar credenciais
          </button>
        </div>
      </div>

      {/* Import tool */}
      <div className={`rounded-2xl border p-5 ${s.card} space-y-4`}>
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-orange-500" />
          <h2 className={`font-semibold ${s.textPrimary}`}>Importar produto do AliExpress</h2>
        </div>
        <div className="flex gap-2">
          <input
            value={url} onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doPreview()}
            placeholder="Cole a URL ou ID do produto AliExpress..."
            className={`flex-1 px-3 py-2 rounded-xl border text-sm ${s.input}`}
          />
          <button onClick={doPreview} disabled={previewing}
            className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 ${s.btnPrimary} disabled:opacity-50`}>
            {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Gerar rascunho
          </button>
        </div>

        {(draftFlags.needs_keys || draftFlags.scrape_note) && (
          <div className={`text-xs rounded-xl p-3 ${s.badge("amber")} flex items-start gap-2`}>
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{draftFlags.scrape_note || "Sem chaves da API oficial: dados parciais. Use o bridge do Hermes para extracao completa."}</span>
          </div>
        )}
        {draftFlags.ai_error && (
          <div className={`text-xs rounded-xl p-3 ${s.badge("red")}`}>IA: {draftFlags.ai_error}</div>
        )}

        {draft && (
          <div className={`rounded-xl border ${s.border} p-4 space-y-3`}>
            {draftFlags.ai_applied && (
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${s.badge("green")}`}>
                <Sparkles className="w-3 h-3" /> Enriquecido por IA
              </span>
            )}
            <div>
              <div className={`text-xs ${s.textMuted}`}>Nome</div>
              <div className={`font-medium ${s.textPrimary}`}>{draft.name || "—"}</div>
            </div>
            {draft.description && (
              <div>
                <div className={`text-xs ${s.textMuted}`}>Descricao</div>
                <div className={`text-sm ${s.textSecondary} whitespace-pre-line line-clamp-6`}>{draft.description}</div>
              </div>
            )}
            <div className="flex flex-wrap gap-4 text-sm">
              <span className={s.textSecondary}>ID: <b className={s.textPrimary}>{draft.ae_product_id || "—"}</b></span>
              <span className={s.textSecondary}>Custo AE: <b className={s.textPrimary}>{draft.ae_cost != null ? `${draft.ae_cost} ${draft.ae_currency}` : "—"}</b></span>
              <span className={s.textSecondary}>Preço sugerido: <b className="text-emerald-500">{draft.suggested_price != null ? `${Number(draft.suggested_price).toLocaleString("pt-PT")} Kz` : "—"}</b></span>
              <span className={s.textSecondary}>Categoria sugerida: <b className={s.textPrimary}>{draft.category_id ?? "—"}</b></span>
            </div>
            {draft.images && draft.images.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {draft.images.slice(0, 8).map((img, i) => (
                  <img key={i} src={img} alt="" className="w-16 h-16 object-cover rounded-lg border" loading="lazy" />
                ))}
              </div>
            )}
            <p className={`text-xs ${s.textMuted}`}>
              Este rascunho pode ser criado como produto pela API (POST /store-api/&#123;loja&#125;/products) ou pelo bridge do Hermes.
            </p>
          </div>
        )}
      </div>

      {/* Import queue -> Hermes */}
      <div className={`rounded-2xl border p-5 ${s.card} space-y-4`}>
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-orange-500" />
          <h2 className={`font-semibold ${s.textPrimary}`}>Enviar URLs para o Hermes (fila)</h2>
        </div>
        <p className={`text-xs ${s.textMuted}`}>
          O SuperLojas coloca as URLs numa fila; o Hermes consulta a fila, abre cada página, extrai tudo e cria os produtos.
        </p>
        <div className="grid md:grid-cols-[200px_1fr] gap-3">
          <select value={enqStore} onChange={(e) => setEnqStore(e.target.value)}
            className={`px-3 py-2 rounded-xl border text-sm ${s.input} h-fit`}>
            <option value="">Escolher loja...</option>
            {stores.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
          </select>
          <textarea value={enqUrls} onChange={(e) => setEnqUrls(e.target.value)}
            placeholder="Cole uma URL por linha..." rows={3}
            className={`px-3 py-2 rounded-xl border text-sm ${s.input}`} />
        </div>
        <div className="flex justify-end">
          <button onClick={doEnqueue} disabled={enqueuing}
            className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 ${s.btnPrimary} disabled:opacity-50`}>
            {enqueuing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
            Enviar para a fila
          </button>
        </div>

        {jobs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`text-left ${s.thText} text-xs`}>
                  <th className="py-2 pr-3">URL</th>
                  <th className="py-2 pr-3">Loja</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2 pr-3">Produto</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id} className={`border-t ${s.borderLight}`}>
                    <td className="py-2 pr-3 max-w-[260px] truncate"><a href={j.url} target="_blank" rel="noreferrer" className="text-orange-500">{j.url}</a></td>
                    <td className="py-2 pr-3">{j.store?.name || "—"}</td>
                    <td className="py-2 pr-3">
                      <span className={`px-2 py-0.5 rounded-lg text-xs ${s.badge(j.status === "done" ? "green" : j.status === "failed" ? "red" : j.status === "processing" ? "amber" : "gray")}`}>
                        {j.status}
                      </span>
                    </td>
                    <td className="py-2 pr-3">{j.product?.name || (j.error ? <span className="text-red-500 text-xs">{j.error}</span> : "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Supplier orders */}
      <div className={`rounded-2xl border p-5 ${s.card} space-y-4`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-orange-500" />
            <h2 className={`font-semibold ${s.textPrimary}`}>Encomendas ao fornecedor (AliExpress)</h2>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className={`w-4 h-4 absolute left-2.5 top-2.5 ${s.textMuted}`} />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadOrders()}
                placeholder="ID / rastreio" className={`pl-8 pr-3 py-2 rounded-xl border text-sm ${s.input}`} />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl border text-sm ${s.input}`}>
              <option value="">Todos</option>
              {Object.keys(STATUS_LABELS).map((k) => <option key={k} value={k}>{STATUS_LABELS[k]}</option>)}
            </select>
            <button onClick={loadOrders} className={`px-3 py-2 rounded-xl ${s.btnSecondary}`}><RefreshCw className="w-4 h-4" /></button>
          </div>
        </div>

        {loadingOrders ? (
          <div className={`py-12 flex justify-center ${s.textMuted}`}><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : orders.length === 0 ? (
          <div className={`py-12 text-center ${s.empty}`}>
            <Truck className="w-10 h-10 mx-auto mb-2" />
            <p className="text-sm">Nenhuma encomenda de fornecedor ainda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`text-left ${s.thText} text-xs`}>
                  <th className="py-2 pr-3">Pedido</th>
                  <th className="py-2 pr-3">AE Order / Rastreio</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2 pr-3">Custo</th>
                  <th className="py-2 pr-3">Venda</th>
                  <th className="py-2 pr-3">Margem</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const ed = editing[o.id] || {};
                  const dirty = Object.keys(ed).length > 0;
                  return (
                    <tr key={o.id} className={`border-t ${s.borderLight} ${s.hoverRow}`}>
                      <td className="py-2 pr-3">
                        <div className={s.textPrimary}>{o.order?.order_number || "—"}</div>
                        <div className={`text-xs ${s.textMuted}`}>{o.store?.name || ""}</div>
                      </td>
                      <td className="py-2 pr-3 space-y-1">
                        <input defaultValue={o.ae_order_id || ""} placeholder="AE order id"
                          onChange={(e) => edit(o.id, "ae_order_id", e.target.value)}
                          className={`w-32 px-2 py-1 rounded-lg border text-xs ${s.input}`} />
                        <input defaultValue={o.tracking_number || ""} placeholder="rastreio"
                          onChange={(e) => edit(o.id, "tracking_number", e.target.value)}
                          className={`w-32 px-2 py-1 rounded-lg border text-xs ${s.input}`} />
                      </td>
                      <td className="py-2 pr-3">
                        <select defaultValue={o.status} onChange={(e) => edit(o.id, "status", e.target.value)}
                          className={`px-2 py-1 rounded-lg border text-xs ${s.input}`}>
                          {Object.keys(STATUS_LABELS).map((k) => <option key={k} value={k}>{STATUS_LABELS[k]}</option>)}
                        </select>
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap">{o.cost != null ? `${o.cost} ${o.cost_currency}` : "—"}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{o.sale_total != null ? `${o.sale_total} ${o.sale_currency}` : "—"}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{margin(o) ?? "—"}</td>
                      <td className="py-2 flex gap-1">
                        {dirty && (
                          <button onClick={() => saveOrder(o.id)} className={`p-1.5 rounded-lg ${s.btnPrimary}`} title="Guardar">
                            <Save className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {o.ae_order_id ? (
                          <button onClick={() => syncOrder(o.id)} className={`p-1.5 rounded-lg ${s.btnSecondary}`} title="Sincronizar rastreio">
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button onClick={() => placeOrder(o.id)} className={`p-1.5 rounded-lg ${s.btnSecondary}`} title="Encomendar no AliExpress (gasta dinheiro)">
                            <ShoppingCart className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={() => deleteOrder(o.id)} className={`p-1.5 rounded-lg ${s.btnDanger}`} title="Remover">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children, s }: { label: string; children: ReactNode; s: ReturnType<typeof useAdminStyles> }) {
  return (
    <label className="block">
      <span className={`text-xs ${s.textMuted} mb-1 block`}>{label}</span>
      {children}
    </label>
  );
}

function StatusPill({ ok, label, s }: { ok: boolean; label: string; s: ReturnType<typeof useAdminStyles> }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${s.badge(ok ? "green" : "gray")}`}>
      {ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
      {label}: {ok ? "ligado" : "por configurar"}
    </span>
  );
}
