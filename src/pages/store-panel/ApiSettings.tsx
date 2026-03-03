import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Key, Copy, RefreshCw, Loader2, Shield, Eye, EyeOff, AlertTriangle,
  Check, X, Code, BookOpen, Lock, Unlock, ToggleLeft, ToggleRight,
  Zap, Globe, ArrowUpRight, Trash2
} from "lucide-react";
import { useToastNotification } from "@/contexts/ToastContext";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

interface ApiSettingsData {
  api_enabled: boolean;
  api_key: string | null;
  api_secret: string | null;
  api_permissions: string[];
  api_rate_limit: number;
  api_last_used_at: string | null;
  plan_allows_api: boolean;
  plan_name: string | null;
  base_url: string;
}

export default function StoreApiSettings() {
  const { token } = useAuth();
  const s = useAdminStyles();
  const toast = useToastNotification();
  const { slug } = useOutletContext<{ slug: string }>();

  const [data, setData] = useState<ApiSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showNewCredentials, setShowNewCredentials] = useState<{ key: string; secret: string } | null>(null);

  // Editable state
  const [enabled, setEnabled] = useState(false);
  const [permissions, setPermissions] = useState<string[]>(["read", "write", "delete"]);
  const [rateLimit, setRateLimit] = useState("60");

  const fetchSettings = () => {
    if (!token || !slug) return;
    setLoading(true);
    fetch(`${API}/store-panel/${slug}/api-settings`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    })
      .then((r) => r.json())
      .then((d: ApiSettingsData) => {
        setData(d);
        setEnabled(d.api_enabled);
        setPermissions(d.api_permissions || ["read", "write", "delete"]);
        setRateLimit(String(d.api_rate_limit || 60));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSettings(); }, [token, slug]);

  const generateKeys = async () => {
    if (!confirm("Gerar novas credenciais de API? As credenciais anteriores serao substituidas.")) return;
    setGenerating(true);
    try {
      const res = await fetch(`${API}/store-panel/${slug}/api-settings/generate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const d = await res.json();
      if (res.ok) {
        setShowNewCredentials({ key: d.api_key, secret: d.api_secret });
        fetchSettings();
        toast.success("Credenciais geradas", "Guarde o secret num local seguro!");
      } else {
        toast.error("Erro", d.error || "Nao foi possivel gerar credenciais.");
      }
    } finally { setGenerating(false); }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/store-panel/${slug}/api-settings`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ api_enabled: enabled, api_permissions: permissions, api_rate_limit: parseInt(rateLimit) || 60 }),
      });
      const d = await res.json();
      if (res.ok) {
        toast.success("Guardado", "Configuracoes de API actualizadas.");
        fetchSettings();
      } else {
        toast.error("Erro", d.message || "Erro ao guardar.");
      }
    } finally { setSaving(false); }
  };

  const revokeKeys = async () => {
    if (!confirm("Revogar todas as credenciais? A API da loja sera desactivada.")) return;
    setRevoking(true);
    try {
      const res = await fetch(`${API}/store-panel/${slug}/api-settings/revoke`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (res.ok) {
        toast.success("Revogado", "Credenciais removidas.");
        setShowNewCredentials(null);
        fetchSettings();
      }
    } finally { setRevoking(false); }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado", `${label} copiado para a area de transferencia.`);
  };

  const togglePermission = (perm: string) => {
    setPermissions((prev) => prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]);
  };

  const inputCls = `w-full ${s.input} border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    );
  }

  // Plan doesn't allow API
  if (data && !data.plan_allows_api) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className={`text-lg font-bold ${s.textPrimary}`}>API da Loja</h2>
          <p className={`text-xs ${s.textMuted}`}>Integre a sua loja com sistemas externos</p>
        </div>
        <div className={`rounded-2xl border ${s.card} p-8 text-center`}>
          <div className="h-16 w-16 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-orange-500" />
          </div>
          <h3 className={`text-base font-bold ${s.textPrimary} mb-2`}>API nao disponivel no plano actual</h3>
          <p className={`text-sm ${s.textMuted} mb-1`}>
            O seu plano <strong>{data.plan_name || "actual"}</strong> nao inclui acesso a API.
          </p>
          <p className={`text-xs ${s.textMuted} mb-6`}>
            Faca upgrade para o plano <strong>Premium</strong> ou <strong>Empresarial</strong> para usar a API.
          </p>
          <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold ${s.btnPrimary}`}>
            <ArrowUpRight className="h-4 w-4" /> Contactar para Upgrade
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-bold ${s.textPrimary}`}>API da Loja</h2>
          <p className={`text-xs ${s.textMuted}`}>Gerencie as credenciais e permissoes da API</p>
        </div>
        {data?.api_key && (
          <button onClick={saveSettings} disabled={saving}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold ${s.btnPrimary} disabled:opacity-50 shadow-sm`}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Guardar
          </button>
        )}
      </div>

      {/* New credentials alert */}
      {showNewCredentials && (
        <div className={`rounded-2xl border-2 border-amber-400 ${s.isDark ? "bg-amber-900/20" : "bg-amber-50"} p-5 space-y-4`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className={`text-sm font-bold ${s.textPrimary}`}>Novas credenciais geradas!</p>
              <p className={`text-xs ${s.textMuted} mt-1`}>
                Guarde o <strong>API Secret</strong> num local seguro. Ele nao sera exibido novamente depois de fechar esta secao.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className={`text-[10px] font-medium ${s.textMuted} uppercase tracking-wider`}>API Key</label>
              <div className="flex gap-2 mt-1">
                <code className={`flex-1 px-3 py-2 rounded-lg text-xs font-mono ${s.isDark ? "bg-black/30 text-emerald-400" : "bg-gray-100 text-gray-800"} break-all`}>
                  {showNewCredentials.key}
                </code>
                <button onClick={() => copyToClipboard(showNewCredentials.key, "API Key")}
                  className={`p-2 rounded-lg ${s.textMuted} hover:text-orange-500 transition-colors`}>
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div>
              <label className={`text-[10px] font-medium ${s.textMuted} uppercase tracking-wider`}>API Secret</label>
              <div className="flex gap-2 mt-1">
                <code className={`flex-1 px-3 py-2 rounded-lg text-xs font-mono ${s.isDark ? "bg-black/30 text-red-400" : "bg-red-50 text-red-800"} break-all`}>
                  {showNewCredentials.secret}
                </code>
                <button onClick={() => copyToClipboard(showNewCredentials.secret, "API Secret")}
                  className={`p-2 rounded-lg ${s.textMuted} hover:text-orange-500 transition-colors`}>
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          <button onClick={() => setShowNewCredentials(null)} className={`text-xs ${s.textMuted} hover:text-orange-500 flex items-center gap-1`}>
            <X className="h-3 w-3" /> Fechar esta secao (confirmo que guardei as credenciais)
          </button>
        </div>
      )}

      {/* No keys yet */}
      {!data?.api_key ? (
        <div className={`rounded-2xl border ${s.card} p-8 text-center`}>
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center mx-auto mb-4">
            <Key className="h-8 w-8 text-orange-500" />
          </div>
          <h3 className={`text-base font-bold ${s.textPrimary} mb-2`}>Nenhuma credencial configurada</h3>
          <p className={`text-sm ${s.textMuted} mb-6`}>
            Gere as suas credenciais para comecar a usar a API da loja.
          </p>
          <button onClick={generateKeys} disabled={generating}
            className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold ${s.btnPrimary} disabled:opacity-50 shadow-md`}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
            Gerar Credenciais de API
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left col — credentials & settings */}
          <div className="lg:col-span-2 space-y-4">

            {/* Credentials */}
            <div className={`rounded-2xl border ${s.card} p-5 space-y-4`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-sm font-bold ${s.textPrimary} flex items-center gap-2`}>
                  <Shield className="h-4 w-4 text-orange-500" /> Credenciais
                </h3>
                <div className="flex gap-2">
                  <button onClick={generateKeys} disabled={generating}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-medium ${s.isDark ? "bg-white/[0.05] text-amber-400" : "bg-amber-50 text-amber-600"} hover:opacity-80`}>
                    {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Regenerar
                  </button>
                  <button onClick={revokeKeys} disabled={revoking}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-medium ${s.isDark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-600"} hover:opacity-80`}>
                    {revoking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />} Revogar
                  </button>
                </div>
              </div>

              <div>
                <label className={`text-[10px] font-medium ${s.textMuted} uppercase tracking-wider`}>API Key</label>
                <div className="flex gap-2 mt-1">
                  <input readOnly value={data.api_key || ""} className={`${inputCls} font-mono text-xs`} />
                  <button onClick={() => copyToClipboard(data.api_key!, "API Key")} className={`p-2.5 rounded-xl border ${s.borderLight} ${s.textMuted} hover:text-orange-500 transition-colors`}>
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className={`text-[10px] font-medium ${s.textMuted} uppercase tracking-wider`}>API Secret</label>
                <div className="flex gap-2 mt-1">
                  <div className="relative flex-1">
                    <input readOnly value={showSecret ? (data.api_secret || "***") : "••••••••••••••••••••••••••••••••"} className={`${inputCls} font-mono text-xs pr-10`} />
                    <button onClick={() => setShowSecret(!showSecret)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 ${s.textMuted} hover:text-orange-500 transition-colors`}>
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {data.api_secret && (
                    <button onClick={() => copyToClipboard(data.api_secret!, "API Secret")} className={`p-2.5 rounded-xl border ${s.borderLight} ${s.textMuted} hover:text-orange-500 transition-colors`}>
                      <Copy className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className={`text-[10px] ${s.textMuted} mt-1`}>O secret so e exibido no momento da geracao. Se perdeu, regenere novas credenciais.</p>
              </div>

              {/* Base URL */}
              <div>
                <label className={`text-[10px] font-medium ${s.textMuted} uppercase tracking-wider`}>Base URL</label>
                <div className="flex gap-2 mt-1">
                  <input readOnly value={data.base_url || ""} className={`${inputCls} font-mono text-xs`} />
                  <button onClick={() => copyToClipboard(data.base_url, "Base URL")} className={`p-2.5 rounded-xl border ${s.borderLight} ${s.textMuted} hover:text-orange-500 transition-colors`}>
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Settings */}
            <div className={`rounded-2xl border ${s.card} p-5 space-y-4`}>
              <h3 className={`text-sm font-bold ${s.textPrimary} flex items-center gap-2`}>
                <Zap className="h-4 w-4 text-orange-500" /> Configuracoes
              </h3>

              {/* Enable/Disable */}
              <button type="button" onClick={() => setEnabled(!enabled)}
                className={`flex items-center gap-3 w-full p-3 rounded-xl border ${s.borderLight} ${enabled ? (s.isDark ? "bg-emerald-500/10" : "bg-emerald-50") : ""} transition-colors`}>
                {enabled ? <ToggleRight className="h-5 w-5 text-emerald-500" /> : <ToggleLeft className="h-5 w-5 text-gray-400" />}
                <div className="text-left flex-1">
                  <p className={`text-xs font-semibold ${s.textPrimary}`}>API {enabled ? "Activa" : "Desactivada"}</p>
                  <p className={`text-[10px] ${s.textMuted}`}>Quando desactivada, todos os pedidos a API serao rejeitados</p>
                </div>
              </button>

              {/* Permissions */}
              <div>
                <label className={`text-[10px] font-medium ${s.textMuted} uppercase tracking-wider mb-2 block`}>Permissoes</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: "read", label: "Leitura", desc: "Listar e ver produtos", icon: BookOpen, color: "blue" },
                    { key: "write", label: "Escrita", desc: "Criar e editar produtos", icon: Code, color: "emerald" },
                    { key: "delete", label: "Eliminacao", desc: "Eliminar produtos", icon: Trash2, color: "red" },
                  ].map((p) => {
                    const active = permissions.includes(p.key);
                    return (
                      <button key={p.key} onClick={() => togglePermission(p.key)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          active
                            ? `${s.isDark ? `bg-${p.color}-500/10 border-${p.color}-500/30` : `bg-${p.color}-50 border-${p.color}-200`}`
                            : `${s.borderLight} opacity-50`
                        }`}>
                        <div className="flex items-center gap-2 mb-1">
                          {active ? <Unlock className={`h-3.5 w-3.5 text-${p.color}-500`} /> : <Lock className="h-3.5 w-3.5 text-gray-400" />}
                          <span className={`text-xs font-semibold ${active ? s.textPrimary : s.textMuted}`}>{p.label}</span>
                        </div>
                        <p className={`text-[10px] ${s.textMuted}`}>{p.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rate limit */}
              <div>
                <label className={`text-[10px] font-medium ${s.textMuted} uppercase tracking-wider`}>Rate Limit (pedidos/min)</label>
                <input type="number" value={rateLimit} onChange={(e) => setRateLimit(e.target.value)}
                  min="10" max="1000" className={`${inputCls} mt-1`} />
                <p className={`text-[10px] ${s.textMuted} mt-1`}>Maximo de pedidos por minuto (10-1000)</p>
              </div>

              {data.api_last_used_at && (
                <p className={`text-[10px] ${s.textMuted}`}>
                  Ultimo uso: {new Date(data.api_last_used_at).toLocaleString("pt-PT")}
                </p>
              )}
            </div>
          </div>

          {/* Right col — documentation */}
          <div className="space-y-4">
            <div className={`rounded-2xl border ${s.card} p-5 space-y-4`}>
              <h3 className={`text-sm font-bold ${s.textPrimary} flex items-center gap-2`}>
                <BookOpen className="h-4 w-4 text-orange-500" /> Documentacao
              </h3>
              <p className={`text-xs ${s.textMuted} leading-relaxed`}>
                Use as credenciais para autenticar os pedidos a API da sua loja. Envie os headers:
              </p>
              <div className={`rounded-xl p-3 ${s.isDark ? "bg-black/30" : "bg-gray-50"} font-mono text-[10px] space-y-1`}>
                <p><span className="text-orange-500">X-Api-Key:</span> <span className={s.textMuted}>sk_...</span></p>
                <p><span className="text-orange-500">X-Api-Secret:</span> <span className={s.textMuted}>ss_...</span></p>
              </div>

              <div className="space-y-2">
                <p className={`text-[10px] font-bold ${s.textPrimary} uppercase tracking-wider`}>Endpoints</p>
                {[
                  { method: "GET", path: "/", desc: "Info da loja" },
                  { method: "GET", path: "/products", desc: "Listar produtos" },
                  { method: "GET", path: "/products/:id", desc: "Ver produto" },
                  { method: "POST", path: "/products", desc: "Criar produto" },
                  { method: "PUT", path: "/products/:id", desc: "Editar produto" },
                  { method: "DELETE", path: "/products/:id", desc: "Eliminar produto" },
                  { method: "GET", path: "/categories", desc: "Listar categorias" },
                ].map((ep) => (
                  <div key={ep.method + ep.path} className={`flex items-center gap-2 text-[10px]`}>
                    <span className={`px-1.5 py-0.5 rounded font-mono font-bold ${
                      ep.method === "GET" ? "bg-blue-100 text-blue-700" :
                      ep.method === "POST" ? "bg-emerald-100 text-emerald-700" :
                      ep.method === "PUT" ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-700"
                    }`}>{ep.method}</span>
                    <code className={s.textPrimary}>{ep.path}</code>
                    <span className={`${s.textMuted} ml-auto`}>{ep.desc}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-2">
                <p className={`text-[10px] font-bold ${s.textPrimary} uppercase tracking-wider`}>Exemplo cURL</p>
                <div className={`rounded-xl p-3 ${s.isDark ? "bg-black/30" : "bg-gray-50"} font-mono text-[10px] leading-relaxed overflow-x-auto`}>
                  <pre className={s.textSecondary}>{`curl -X GET \\
  "${data.base_url}/products" \\
  -H "X-Api-Key: ${data.api_key?.slice(0, 12)}..." \\
  -H "X-Api-Secret: ss_..."  \\
  -H "Accept: application/json"`}</pre>
                </div>
                <button onClick={() => copyToClipboard(`curl -X GET "${data.base_url}/products" -H "X-Api-Key: ${data.api_key}" -H "X-Api-Secret: YOUR_SECRET" -H "Accept: application/json"`, "cURL")}
                  className={`flex items-center gap-1 text-[10px] ${s.textMuted} hover:text-orange-500 transition-colors`}>
                  <Copy className="h-3 w-3" /> Copiar exemplo
                </button>
              </div>

              <div className="space-y-2 pt-2">
                <p className={`text-[10px] font-bold ${s.textPrimary} uppercase tracking-wider`}>Criar Produto (JSON)</p>
                <div className={`rounded-xl p-3 ${s.isDark ? "bg-black/30" : "bg-gray-50"} font-mono text-[10px] leading-relaxed overflow-x-auto`}>
                  <pre className={s.textSecondary}>{`POST ${data.base_url}/products
Content-Type: application/json

{
  "name": "Produto Exemplo",
  "price": 5000,
  "stock": 10,
  "category": "Electronica",
  "description": "Descricao...",
  "images": ["/url/image1.jpg"]
}`}</pre>
                </div>
              </div>

              <div className={`rounded-xl p-3 border ${s.isDark ? "border-amber-500/20 bg-amber-900/10" : "border-amber-200 bg-amber-50"}`}>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <p className={`text-[10px] ${s.isDark ? "text-amber-300" : "text-amber-700"} leading-relaxed`}>
                    Nunca exponha o API Secret em codigo frontend ou repositorios publicos. Use variaveis de ambiente no servidor.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
