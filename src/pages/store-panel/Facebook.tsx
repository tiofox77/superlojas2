import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import { useEffect, useState, useCallback, type ReactNode } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Facebook, Loader2, CheckCircle2, AlertTriangle, HelpCircle, ChevronDown,
  RefreshCw, Save, Copy, ExternalLink, ArrowRight, ArrowLeft, PartyPopper, Package,
} from "lucide-react";
import { useToastNotification } from "@/contexts/ToastContext";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

const STEPS = ["Ligar conta", "Testar", "Sincronizar", "Automático"];

export default function StorePanelFacebook() {
  const { token } = useAuth();
  const { slug } = useOutletContext<{ slug: string }>();
  const s = useAdminStyles();
  const toast = useToastNotification();
  const hdrs: Record<string, string> = {
    Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json",
  };

  const [step, setStep] = useState(1);
  const [cfg, setCfg] = useState({
    fb_enabled: true, fb_access_token: "",
    fb_catalog_id: "", fb_business_id: "", fb_currency: "AOA",
  });
  const [meta, setMeta] = useState<{ token_preview?: string | null; token_set?: boolean; last_sync?: string | null; feed_url?: string; product_count?: number }>({});
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showHelper, setShowHelper] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [syncDone, setSyncDone] = useState<number | null>(null);

  type Biz = { id: string; name: string; catalogs: { id: string; name: string; product_count?: number | null }[] };
  const [businesses, setBusinesses] = useState<Biz[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);

  const loadConfig = useCallback(async () => {
    if (!slug || !token) return;
    try {
      const res = await fetch(`${API}/store-panel/${slug}/facebook/config`, { headers: hdrs });
      if (!res.ok) return;
      const d = await res.json();
      setCfg((c) => ({
        ...c,
        fb_enabled: d.enabled ?? true,
        fb_catalog_id: d.catalog_id || "",
        fb_business_id: d.business_id || "",
        fb_currency: d.currency || "AOA",
      }));
      setMeta({ token_preview: d.access_token_preview, token_set: d.access_token_set, last_sync: d.last_sync, feed_url: d.feed_url, product_count: d.product_count });
    } catch { /* ignore */ }
  }, [slug, token]);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const fetchCatalogs = async () => {
    if (!cfg.fb_access_token && !meta.token_set) { toast.error("Falta o token", "Cole o Access Token primeiro."); return; }
    setLoadingCatalogs(true);
    try {
      const res = await fetch(`${API}/store-panel/${slug}/facebook/catalogs`, {
        method: "POST", headers: hdrs, body: JSON.stringify({ access_token: cfg.fb_access_token.trim() || undefined }),
      });
      const d = await res.json();
      if (!d.ok) { toast.error("Falhou", d.error || "Não foi possível obter catálogos."); return; }
      setBusinesses(d.businesses || []);
      const total = (d.businesses || []).reduce((n: number, b: Biz) => n + b.catalogs.length, 0);
      if (total === 0) toast.error("Sem catálogos", "Nenhum catálogo encontrado nesta conta.");
      else toast.success("Catálogos carregados", `${total} encontrado(s). Escolha um em baixo.`);
    } catch { toast.error("Erro", "Falha de rede."); }
    finally { setLoadingCatalogs(false); }
  };

  const pickCatalog = (catalogId: string) => {
    const biz = businesses.find((b) => b.catalogs.some((c) => c.id === catalogId));
    setCfg((c) => ({ ...c, fb_catalog_id: catalogId, fb_business_id: biz?.id || c.fb_business_id }));
  };

  const saveAndNext = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/store-panel/${slug}/facebook/config`, { method: "PUT", headers: hdrs, body: JSON.stringify(cfg) });
      if (!res.ok) throw new Error();
      setCfg((c) => ({ ...c, fb_access_token: "" }));
      await loadConfig();
      setStep(2);
    } catch { toast.error("Erro", "Não foi possível guardar."); }
    finally { setSaving(false); }
  };

  const doTest = async () => {
    setTestResult(null);
    try {
      const res = await fetch(`${API}/store-panel/${slug}/facebook/test`, { headers: hdrs });
      const d = await res.json();
      setTestResult({ ok: !!d.ok, message: d.message || "" });
    } catch { setTestResult({ ok: false, message: "Falha de rede." }); }
  };

  const doSync = async () => {
    setSyncing(true); setSyncDone(null);
    try {
      const res = await fetch(`${API}/store-panel/${slug}/facebook/sync`, { method: "POST", headers: hdrs });
      const d = await res.json();
      if (d.ok) { setSyncDone(d.synced); loadConfig(); }
      else toast.error("Falha", d.error || "Não foi possível sincronizar.");
    } catch { toast.error("Erro", "Falha de rede."); }
    finally { setSyncing(false); }
  };

  const copyFeed = () => {
    if (meta.feed_url) { navigator.clipboard.writeText(meta.feed_url); toast.success("Copiado", "URL do feed copiada."); }
  };

  const btnPrimary = `px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 ${s.btnPrimary} disabled:opacity-50`;
  const btnGhost = `px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 ${s.btnSecondary}`;

  const catalogUrl = cfg.fb_catalog_id
    ? `https://business.facebook.com/commerce/catalogs/${cfg.fb_catalog_id}/products`
    : null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Facebook className="w-6 h-6 text-blue-600" />
        <div>
          <h1 className={`text-lg font-bold ${s.textPrimary}`}>Sincronizar com Facebook & Instagram</h1>
          <p className={`text-xs ${s.textMuted}`}>Siga os passos para publicar o catálogo desta loja</p>
        </div>
      </div>

      {/* Stepper */}
      <div className={`rounded-2xl border p-4 ${s.card}`}>
        <div className="flex items-center">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done = step > n;
            const active = step === n;
            return (
              <div key={label} className="flex items-center flex-1 last:flex-none">
                <button onClick={() => n < step && setStep(n)} className="flex items-center gap-2 shrink-0">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${done ? "bg-green-500 text-white" : active ? "bg-blue-600 text-white" : s.badge("gray")}`}>
                    {done ? <CheckCircle2 className="w-4 h-4" /> : n}
                  </span>
                  <span className={`text-xs font-medium hidden sm:block ${active ? s.textPrimary : s.textMuted}`}>{label}</span>
                </button>
                {n < STEPS.length && <div className={`h-0.5 flex-1 mx-2 ${done ? "bg-green-500" : s.skeleton}`} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 1 — Ligar conta */}
      {step === 1 && (
        <div className={`rounded-2xl border p-5 ${s.card} space-y-4`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className={`font-semibold ${s.textPrimary}`}>Passo 1 — Ligar a conta do Facebook</h2>
            <button onClick={() => setShowHelper((v) => !v)} className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg ${s.btnSecondary}`}>
              <HelpCircle className="w-3.5 h-3.5" /> Como obter o token
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHelper ? "rotate-180" : ""}`} />
            </button>
          </div>

          {showHelper && (
            <div className={`rounded-xl border ${s.border} p-4 text-sm ${s.textSecondary} space-y-2`}>
              <ol className="list-decimal ml-5 space-y-1.5">
                <li>Em <a href="https://business.facebook.com/settings" target="_blank" rel="noreferrer" className="text-blue-500 inline-flex items-center gap-1">Business Settings <ExternalLink className="w-3 h-3" /></a> → <b>Utilizadores do sistema</b>, crie um system user e atribua o seu <b>Catálogo</b>.</li>
                <li>Gere um <b>token</b> com as permissões <code>catalog_management</code> e <code>business_management</code>. Começa por <code>EAA...</code></li>
                <li>Cole abaixo e clique <b>Buscar catálogos</b> — depois escolha o catálogo na lista.</li>
              </ol>
            </div>
          )}

          <Field label="Access Token (system user)" s={s}>
            <div className="flex gap-2">
              <input type="password" value={cfg.fb_access_token} onChange={(e) => setCfg({ ...cfg, fb_access_token: e.target.value })}
                placeholder={meta.token_preview || "EAA..."} className={`flex-1 px-3 py-2 rounded-xl border text-sm ${s.input}`} />
              <button onClick={fetchCatalogs} disabled={loadingCatalogs} type="button" className={`${btnGhost} whitespace-nowrap`}>
                {loadingCatalogs ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Buscar catálogos
              </button>
            </div>
          </Field>

          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Catálogo" s={s}>
              {businesses.length > 0 ? (
                <select value={cfg.fb_catalog_id} onChange={(e) => pickCatalog(e.target.value)} className={`w-full px-3 py-2 rounded-xl border text-sm ${s.input}`}>
                  <option value="">Escolher catálogo...</option>
                  {businesses.map((b) => (
                    <optgroup key={b.id} label={b.name}>
                      {b.catalogs.map((c) => <option key={c.id} value={c.id}>{c.name}{c.product_count != null ? ` (${c.product_count})` : ""}</option>)}
                    </optgroup>
                  ))}
                </select>
              ) : (
                <input value={cfg.fb_catalog_id} onChange={(e) => setCfg({ ...cfg, fb_catalog_id: e.target.value })}
                  placeholder="Catalog ID (ou clique em Buscar catálogos)" className={`w-full px-3 py-2 rounded-xl border text-sm ${s.input}`} />
              )}
            </Field>
            <Field label="Moeda" s={s}>
              <input value={cfg.fb_currency} onChange={(e) => setCfg({ ...cfg, fb_currency: e.target.value })} className={`w-full px-3 py-2 rounded-xl border text-sm ${s.input}`} />
            </Field>
          </div>

          <div className="flex justify-end pt-2">
            <button onClick={saveAndNext} disabled={saving || (!cfg.fb_catalog_id && !meta.token_set)} className={btnPrimary}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar e continuar <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — Testar */}
      {step === 2 && (
        <div className={`rounded-2xl border p-5 ${s.card} space-y-4`}>
          <h2 className={`font-semibold ${s.textPrimary}`}>Passo 2 — Testar a ligação</h2>
          <p className={`text-sm ${s.textSecondary}`}>Confirme que o token e o catálogo estão correctos.</p>
          <button onClick={doTest} className={btnGhost}><RefreshCw className="w-4 h-4" /> Testar ligação</button>
          {testResult && (
            <div className={`rounded-xl p-3 text-sm flex items-start gap-2 ${s.badge(testResult.ok ? "green" : "red")}`}>
              {testResult.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}
          <div className="flex justify-between pt-2">
            <button onClick={() => setStep(1)} className={btnGhost}><ArrowLeft className="w-4 h-4" /> Voltar</button>
            <button onClick={() => setStep(3)} disabled={!testResult?.ok} className={btnPrimary}>Continuar <ArrowRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Step 3 — Sincronizar */}
      {step === 3 && (
        <div className={`rounded-2xl border p-5 ${s.card} space-y-4`}>
          <h2 className={`font-semibold ${s.textPrimary}`}>Passo 3 — Enviar os produtos</h2>
          <div className={`rounded-xl border ${s.border} p-4 flex items-center gap-3`}>
            <Package className="w-8 h-8 text-blue-600" />
            <div>
              <div className={`text-lg font-bold ${s.textPrimary}`}>{meta.product_count ?? 0} produtos activos</div>
              <div className={`text-xs ${s.textMuted}`}>serão enviados para o catálogo do Facebook</div>
            </div>
          </div>
          <button onClick={doSync} disabled={syncing} className={btnPrimary}>
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sincronizar agora
          </button>
          {syncDone !== null && (
            <div className={`rounded-xl p-3 text-sm flex flex-wrap items-center gap-2 ${s.badge("green")}`}>
              <CheckCircle2 className="w-4 h-4" /> {syncDone} produtos sincronizados com sucesso.
              {catalogUrl && (
                <a href={catalogUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline font-medium ml-1">
                  Ver catálogo no Facebook <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}
          <div className="flex justify-between pt-2">
            <button onClick={() => setStep(2)} className={btnGhost}><ArrowLeft className="w-4 h-4" /> Voltar</button>
            <button onClick={() => setStep(4)} disabled={syncDone === null} className={btnPrimary}>Continuar <ArrowRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Step 4 — Automático */}
      {step === 4 && (
        <div className={`rounded-2xl border p-5 ${s.card} space-y-4`}>
          <div className="flex items-center gap-2">
            <PartyPopper className="w-5 h-5 text-green-500" />
            <h2 className={`font-semibold ${s.textPrimary}`}>Passo 4 — Manter sempre actualizado (automático)</h2>
          </div>
          <p className={`text-sm ${s.textSecondary}`}>
            Para o Facebook actualizar sozinho quando adicionar/editar produtos, configure o <b>feed agendado</b> — assim não precisa de sincronizar à mão.
          </p>
          <div className="flex gap-2">
            <input readOnly value={meta.feed_url || ""} className={`flex-1 px-3 py-2 rounded-xl border text-sm ${s.input}`} />
            <button onClick={copyFeed} className={`px-3 py-2 rounded-xl ${s.btnSecondary}`} title="Copiar"><Copy className="w-4 h-4" /></button>
          </div>
          <ol className={`list-decimal ml-5 text-sm ${s.textSecondary} space-y-1`}>
            <li>Abra o <a href="https://business.facebook.com/commerce" target="_blank" rel="noreferrer" className="text-blue-500 inline-flex items-center gap-1">Commerce Manager <ExternalLink className="w-3 h-3" /></a> → o seu Catálogo.</li>
            <li>Vá a <b>Fontes de dados → Adicionar itens → Feed agendado</b>.</li>
            <li>Cole o URL acima, escolha a frequência (ex.: diária) e conclua.</li>
          </ol>
          {catalogUrl && (
            <a href={catalogUrl} target="_blank" rel="noreferrer" className={`${btnGhost} w-fit`}>
              <Facebook className="w-4 h-4 text-blue-600" /> Ver catálogo no Facebook <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <div className="flex justify-between pt-2">
            <button onClick={() => setStep(3)} className={btnGhost}><ArrowLeft className="w-4 h-4" /> Voltar</button>
            <button onClick={() => { toast.success("Tudo pronto!", "A sua loja está ligada ao Facebook."); }} className={btnPrimary}>
              <CheckCircle2 className="w-4 h-4" /> Concluir
            </button>
          </div>
        </div>
      )}
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
