import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import { useEffect, useState, useCallback, type ReactNode } from "react";
import {
  Facebook, Loader2, CheckCircle2, AlertTriangle, HelpCircle, ChevronDown,
  RefreshCw, Save, Copy, Link2, ExternalLink,
} from "lucide-react";
import { useToastNotification } from "@/contexts/ToastContext";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

export default function AdminFacebook() {
  const { token } = useAuth();
  const s = useAdminStyles();
  const toast = useToastNotification();
  const hdrs: Record<string, string> = {
    Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json",
  };

  const [cfg, setCfg] = useState({
    facebook_enabled: false, facebook_access_token: "",
    facebook_catalog_id: "", facebook_business_id: "", facebook_currency: "AOA",
  });
  const [meta, setMeta] = useState<{ token_preview?: string | null; token_set?: boolean; last_sync?: string | null; feed_url?: string }>({});
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showHelper, setShowHelper] = useState(false);

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin/facebook/config`, { headers: hdrs });
      if (!res.ok) return;
      const d = await res.json();
      setCfg((c) => ({
        ...c,
        facebook_enabled: !!d.enabled,
        facebook_catalog_id: d.catalog_id || "",
        facebook_business_id: d.business_id || "",
        facebook_currency: d.currency || "AOA",
      }));
      setMeta({ token_preview: d.access_token_preview, token_set: d.access_token_set, last_sync: d.last_sync, feed_url: d.feed_url });
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/admin/facebook/config`, { method: "PUT", headers: hdrs, body: JSON.stringify(cfg) });
      if (!res.ok) throw new Error();
      toast.success("Configuração guardada");
      setCfg((c) => ({ ...c, facebook_access_token: "" }));
      loadConfig();
    } catch { toast.error("Erro ao guardar"); }
    finally { setSaving(false); }
  };

  const test = async () => {
    try {
      const res = await fetch(`${API}/admin/facebook/test`, { headers: hdrs });
      const d = await res.json();
      if (d.ok) toast.success(d.message || "Conexão OK"); else toast.error(d.message || "Falhou");
    } catch { toast.error("Erro ao testar"); }
  };

  const syncNow = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${API}/admin/facebook/sync`, { method: "POST", headers: hdrs });
      const d = await res.json();
      if (d.ok) { toast.success(`Sincronizados ${d.synced} produtos`); loadConfig(); }
      else toast.error(d.error || "Falha na sincronização");
    } catch { toast.error("Erro de rede"); }
    finally { setSyncing(false); }
  };

  const copyFeed = () => {
    if (meta.feed_url) { navigator.clipboard.writeText(meta.feed_url); toast.success("URL do feed copiada"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Facebook className="w-6 h-6 text-blue-600" />
        <h1 className={`text-xl font-bold ${s.textPrimary}`}>Facebook & Instagram Catalog</h1>
      </div>

      {/* Status */}
      <div className={`rounded-2xl border p-4 ${s.card} flex flex-wrap items-center gap-4 text-sm`}>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${s.badge(meta.token_set && cfg.facebook_catalog_id ? "green" : "gray")}`}>
          {meta.token_set && cfg.facebook_catalog_id ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
          {meta.token_set && cfg.facebook_catalog_id ? "Ligado" : "Por configurar"}
        </span>
        {meta.last_sync && <span className={s.textSecondary}>Última sync: <b className={s.textPrimary}>{new Date(meta.last_sync).toLocaleString("pt-PT")}</b></span>}
        <button onClick={test} className={`text-xs px-2.5 py-1 rounded-lg ${s.btnSecondary}`}>Testar conexão</button>
        <button onClick={syncNow} disabled={syncing} className={`ml-auto text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${s.btnPrimary} disabled:opacity-50`}>
          {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Sincronizar agora
        </button>
      </div>

      {/* Feed URL */}
      <div className={`rounded-2xl border p-5 ${s.card} space-y-3`}>
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-blue-600" />
          <h2 className={`font-semibold ${s.textPrimary}`}>Feed de produtos (Facebook puxa sozinho)</h2>
        </div>
        <p className={`text-xs ${s.textMuted}`}>
          Cole este URL no <b>Commerce Manager → Catálogo → Fontes de dados → Feed agendado</b>. O Facebook busca os produtos automaticamente (a cada hora/dia). Não precisa de token.
        </p>
        <div className="flex gap-2">
          <input readOnly value={meta.feed_url || ""} className={`flex-1 px-3 py-2 rounded-xl border text-sm ${s.input}`} />
          <button onClick={copyFeed} className={`px-3 py-2 rounded-xl ${s.btnSecondary}`} title="Copiar"><Copy className="w-4 h-4" /></button>
          {meta.feed_url && <a href={meta.feed_url} target="_blank" rel="noreferrer" className={`px-3 py-2 rounded-xl ${s.btnSecondary}`} title="Abrir"><ExternalLink className="w-4 h-4" /></a>}
        </div>
      </div>

      {/* Credentials + helper */}
      <div className={`rounded-2xl border p-5 ${s.card} space-y-4`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className={`font-semibold ${s.textPrimary}`}>Ligação por API (sincronização direta)</h2>
          <button onClick={() => setShowHelper((v) => !v)} className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg ${s.btnSecondary}`}>
            <HelpCircle className="w-3.5 h-3.5" /> Como obter token e Catalog ID
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHelper ? "rotate-180" : ""}`} />
          </button>
        </div>

        {showHelper && (
          <div className={`rounded-xl border ${s.border} p-4 text-sm ${s.textSecondary} space-y-2`}>
            <ol className="list-decimal ml-5 space-y-1.5">
              <li>Abra o <a href="https://business.facebook.com/commerce" target="_blank" rel="noreferrer" className="text-blue-500 inline-flex items-center gap-1">Commerce Manager <ExternalLink className="w-3 h-3" /></a> e crie um <b>Catálogo</b> (tipo: E-commerce).</li>
              <li>Copie o <b>Catalog ID</b> (aparece nas definições do catálogo) para o campo abaixo.</li>
              <li>Em <a href="https://business.facebook.com/settings" target="_blank" rel="noreferrer" className="text-blue-500 inline-flex items-center gap-1">Business Settings <ExternalLink className="w-3 h-3" /></a> → Utilizadores → <b>Utilizadores do sistema</b>, crie um system user e gere um <b>token</b> com as permissões <code>catalog_management</code> e <code>business_management</code>.</li>
              <li>Cole o token no campo abaixo e guarde. Use <b>"Testar conexão"</b> para validar e <b>"Sincronizar agora"</b> para enviar os produtos.</li>
            </ol>
            <p className={`text-xs ${s.textMuted}`}>Alternativa mais simples: use apenas o <b>feed</b> acima (não precisa de token).</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Access Token (system user)" s={s}>
            <input type="password" value={cfg.facebook_access_token} onChange={(e) => setCfg({ ...cfg, facebook_access_token: e.target.value })}
              placeholder={meta.token_preview || "Access Token"} className={`w-full px-3 py-2 rounded-xl border text-sm ${s.input}`} />
          </Field>
          <Field label="Catalog ID" s={s}>
            <input value={cfg.facebook_catalog_id} onChange={(e) => setCfg({ ...cfg, facebook_catalog_id: e.target.value })}
              placeholder="ex: 1234567890" className={`w-full px-3 py-2 rounded-xl border text-sm ${s.input}`} />
          </Field>
          <Field label="Business ID (opcional)" s={s}>
            <input value={cfg.facebook_business_id} onChange={(e) => setCfg({ ...cfg, facebook_business_id: e.target.value })}
              className={`w-full px-3 py-2 rounded-xl border text-sm ${s.input}`} />
          </Field>
          <Field label="Moeda" s={s}>
            <input value={cfg.facebook_currency} onChange={(e) => setCfg({ ...cfg, facebook_currency: e.target.value })}
              className={`w-full px-3 py-2 rounded-xl border text-sm ${s.input}`} />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={cfg.facebook_enabled} onChange={(e) => setCfg({ ...cfg, facebook_enabled: e.target.checked })} />
          <span className={s.textSecondary}>Integração activa</span>
        </label>

        <div className="flex justify-end">
          <button onClick={save} disabled={saving} className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 ${s.btnPrimary} disabled:opacity-50`}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar
          </button>
        </div>
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
