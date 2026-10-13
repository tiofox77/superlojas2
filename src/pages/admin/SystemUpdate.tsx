import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import { useEffect, useState, useCallback } from "react";
import { useToastNotification } from "@/contexts/ToastContext";
import {
  Github, Loader2, RefreshCw, Tag, Download, ExternalLink, Star, GitFork,
  Shield, Clock, CheckCircle2, AlertTriangle, Settings, Key, Wifi, WifiOff,
  ArrowUpRight, Package, Globe, ChevronDown, ChevronUp, Copy, Info,
  Rocket, XCircle, Database, FolderSync, FileDown, Trash2, Eye, EyeOff, Save
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

interface Release {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  prerelease: boolean;
  published_at: string;
  html_url: string;
  zipball_url: string;
  author: { login: string; avatar_url: string };
  assets: { name: string; size: number; downloads: number; url: string }[];
}

interface Config {
  github_repo: string;
  has_token: boolean;
  token_preview: string;
  current_version: string;
  last_check: string | null;
  last_install: string | null;
}

interface ConnectionResult {
  ok: boolean;
  error?: string;
  repo?: {
    full_name: string; description: string; html_url: string;
    default_branch: string; private: boolean; stars: number;
    forks: number; language: string; updated_at: string;
    owner: { login: string; avatar_url: string };
  };
  rate_limit?: { limit: number; remaining: number; reset_at: string };
  authenticated?: boolean;
}

type Step = { step: string; status: string; message: string };

export default function SystemUpdate() {
  const { token } = useAuth();
  const s = useAdminStyles();
  const toast = useToastNotification();

  // ─── State ───
  const [config, setConfig] = useState<Config | null>(null);
  const [conn, setConn] = useState<ConnectionResult | null>(null);
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingReleases, setLoadingReleases] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [expandedRelease, setExpandedRelease] = useState<number | null>(null);
  const [settingVersion, setSettingVersion] = useState<string | null>(null);
  const [installing, setInstalling] = useState<string | null>(null);
  const [installSteps, setInstallSteps] = useState<Step[]>([]);
  const [installResult, setInstallResult] = useState<{ success: boolean; message: string; version?: string; files_copied?: number; files_skipped?: number } | null>(null);
  const [confirmModal, setConfirmModal] = useState<Release | null>(null);

  // Form
  const [repoUrl, setRepoUrl] = useState("");
  const [ghToken, setGhToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [currentVer, setCurrentVer] = useState("");
  const [configDirty, setConfigDirty] = useState(false);

  const hdrs: Record<string, string> = { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" };

  const fmtDate = (d: string) => {
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString("pt", { day: "2-digit", month: "short", year: "numeric" }) + " " +
        dt.toLocaleTimeString("pt", { hour: "2-digit", minute: "2-digit" });
    } catch { return d; }
  };

  const fmtBytes = (b: number) => {
    if (b < 1024) return b + " B";
    if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
    return (b / 1048576).toFixed(1) + " MB";
  };

  const isNewer = useCallback((tag: string) => {
    const clean = (v: string) => v.replace(/^[vV]/, "");
    const parts = (v: string) => v.split(".").map(Number);
    const a = parts(clean(tag));
    const b = parts(clean(currentVer));
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if ((a[i] || 0) > (b[i] || 0)) return true;
      if ((a[i] || 0) < (b[i] || 0)) return false;
    }
    return false;
  }, [currentVer]);

  // ─── API calls ───
  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API}/admin/system-update/config`, { headers: hdrs });
      if (!res.ok) throw new Error();
      const data: Config = await res.json();
      setConfig(data);
      setRepoUrl(data.github_repo || "");
      setGhToken(data.token_preview || "");
      setCurrentVer(data.current_version || "1.0.0");
      setConfigDirty(false);
      return data;
    } catch { toast.error("Erro ao carregar configuracao"); return null; }
  };

  const fetchReleases = async (refresh = false) => {
    setLoadingReleases(true);
    try {
      const url = `${API}/admin/system-update/releases${refresh ? "?refresh=1" : ""}`;
      const res = await fetch(url, { headers: hdrs });
      const data = await res.json();
      if (res.ok) {
        setReleases(data.releases || []);
        if (data.current_version) setCurrentVer(data.current_version);
      } else {
        toast.error(data.error || "Erro ao carregar releases");
      }
    } catch { toast.error("Erro de conexao"); }
    finally { setLoadingReleases(false); }
  };

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetchConfig().then((cfg) => {
      if (cfg?.github_repo) fetchReleases();
    }).finally(() => setLoading(false));
  }, [token]);

  const saveConfig = async () => {
    if (!repoUrl.trim()) { toast.error("Preencha o repositorio"); return; }
    setSaving(true);
    try {
      const body: Record<string, string> = { github_repo: repoUrl, current_version: currentVer };
      // Only send token if user typed a new one (not the masked preview)
      if (ghToken && !ghToken.includes("••••")) {
        body.github_token = ghToken;
      }
      const res = await fetch(`${API}/admin/system-update/config`, {
        method: "PUT", headers: hdrs, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Guardado");
        // Update local state from response
        setConfig(prev => prev ? {
          ...prev,
          github_repo: data.github_repo || prev.github_repo,
          has_token: data.has_token ?? prev.has_token,
          token_preview: data.token_preview || prev.token_preview,
          current_version: data.current_version || prev.current_version,
        } : prev);
        if (data.token_preview) setGhToken(data.token_preview);
        setConfigDirty(false);
        // Auto-test connection + fetch releases after save
        testConnection();
        fetchReleases(true);
      } else {
        toast.error(data.message || data.error || "Erro ao guardar");
      }
    } catch { toast.error("Erro de conexao"); }
    finally { setSaving(false); }
  };

  const testConnection = async () => {
    setTesting(true);
    setConn(null);
    try {
      const res = await fetch(`${API}/admin/system-update/test`, { headers: hdrs });
      const data: ConnectionResult = await res.json();
      setConn(data);
      if (data.ok) toast.success("Conexao OK!");
      else toast.error(data.error || "Falha na conexao");
    } catch { toast.error("Erro de conexao"); setConn({ ok: false, error: "Sem resposta do servidor" }); }
    finally { setTesting(false); }
  };

  const removeToken = async () => {
    try {
      const res = await fetch(`${API}/admin/system-update/token`, { method: "DELETE", headers: hdrs });
      if (res.ok) {
        toast.success("Token removido");
        setGhToken("");
        setConfig(prev => prev ? { ...prev, has_token: false, token_preview: "" } : prev);
        setConn(null);
      }
    } catch { toast.error("Erro"); }
  };

  const markVersion = async (version: string) => {
    setSettingVersion(version);
    try {
      const res = await fetch(`${API}/admin/system-update/set-version`, {
        method: "PUT", headers: hdrs, body: JSON.stringify({ version }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        const v = data.current_version || version.replace(/^[vV]/, "");
        setCurrentVer(v);
        setConfig(prev => prev ? { ...prev, current_version: v } : prev);
      } else toast.error(data.message);
    } catch { toast.error("Erro"); }
    finally { setSettingVersion(null); }
  };

  const installRelease = async (rel: Release) => {
    setConfirmModal(null);
    setInstalling(rel.tag_name);
    setInstallSteps([]);
    setInstallResult(null);
    setExpandedRelease(rel.id);
    try {
      const res = await fetch(`${API}/admin/system-update/install`, {
        method: "POST", headers: hdrs,
        body: JSON.stringify({ tag: rel.tag_name, zipball_url: rel.zipball_url }),
      });
      const data = await res.json();
      if (data.steps) setInstallSteps(data.steps);
      if (res.ok) {
        const v = data.version || rel.tag_name.replace(/^[vV]/, "");
        setInstallResult({ success: true, message: data.message, version: v, files_copied: data.files_copied, files_skipped: data.files_skipped });
        setCurrentVer(v);
        setConfig(prev => prev ? { ...prev, current_version: v } : prev);
        toast.success(data.message);
      } else {
        setInstallResult({ success: false, message: data.error || "Erro na instalacao" });
        toast.error(data.error || "Falha");
      }
    } catch {
      setInstallResult({ success: false, message: "Erro de conexao ao servidor" });
      toast.error("Erro de conexao");
    } finally { setInstalling(null); }
  };

  // ─── Helpers ───
  const cardCls = `rounded-2xl border ${s.card} p-5`;
  const inputCls = `w-full ${s.input} border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20`;
  const labelCls = `text-xs font-semibold ${s.textPrimary} mb-1.5 block`;
  const stepIcons: Record<string, typeof Rocket> = {
    download: FileDown, extract: FolderSync, backup: Shield,
    copy: FolderSync, migrate: Database, seed: Database,
    cache: Trash2, patch_env: Globe, version: Tag,
  };

  if (loading) return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className={`rounded-2xl border ${s.card} p-6 animate-pulse`}>
          <div className={`h-5 w-40 ${s.skeleton} rounded mb-4`} />
          <div className={`h-10 ${s.skeleton} rounded-xl`} />
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-5 max-w-5xl">
      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-bold ${s.textPrimary}`}>Actualizacao do Sistema</h2>
          <p className={`text-xs ${s.textMuted}`}>Gerir versoes e actualizacoes via GitHub</p>
        </div>
        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${
          s.isDark ? "bg-white/5 text-white/60" : "bg-gray-100 text-gray-600"
        }`}>
          <Tag className="h-3.5 w-3.5" /> v{currentVer}
        </div>
      </div>

      {/* ═══ Connection Status Banner ═══ */}
      {conn && (
        <div className={`rounded-2xl border p-4 ${
          conn.ok
            ? (s.isDark ? "border-emerald-500/20 bg-emerald-500/5" : "border-emerald-200 bg-emerald-50")
            : (s.isDark ? "border-red-500/20 bg-red-500/5" : "border-red-200 bg-red-50")
        }`}>
          <div className="flex items-start gap-3">
            {conn.ok ? <Wifi className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" /> : <WifiOff className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />}
            <div className="flex-1 min-w-0">
              {conn.ok && conn.repo ? (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <img src={conn.repo.owner.avatar_url} alt="" className="h-6 w-6 rounded-lg" />
                    <span className={`text-sm font-bold ${s.textPrimary}`}>{conn.repo.full_name}</span>
                    {conn.repo.private && (
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${s.isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600"}`}>
                        <Shield className="inline h-2.5 w-2.5 mr-0.5" /> Privado
                      </span>
                    )}
                    {conn.authenticated && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/10 text-emerald-600">
                        <Key className="inline h-2.5 w-2.5 mr-0.5" /> Autenticado
                      </span>
                    )}
                    <a href={conn.repo.html_url} target="_blank" rel="noopener noreferrer"
                      className={`text-[10px] ${s.textMuted} hover:text-orange-500 flex items-center gap-0.5`}>
                      <ExternalLink className="h-2.5 w-2.5" /> Abrir
                    </a>
                  </div>
                  {conn.repo.description && <p className={`text-xs ${s.textMuted} mt-1`}>{conn.repo.description}</p>}
                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    <span className={`text-[11px] ${s.textMuted} flex items-center gap-1`}><Star className="h-3 w-3 text-amber-500" /> {conn.repo.stars}</span>
                    <span className={`text-[11px] ${s.textMuted} flex items-center gap-1`}><GitFork className="h-3 w-3" /> {conn.repo.forks}</span>
                    {conn.repo.language && <span className={`text-[11px] ${s.textMuted} flex items-center gap-1`}><Globe className="h-3 w-3" /> {conn.repo.language}</span>}
                    {conn.rate_limit && (
                      <span className={`text-[11px] ${conn.rate_limit.remaining < 10 ? "text-amber-500" : s.textMuted} flex items-center gap-1`}>
                        API: {conn.rate_limit.remaining}/{conn.rate_limit.limit}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div>
                  <p className={`text-sm font-semibold ${s.isDark ? "text-red-400" : "text-red-700"}`}>Falha na conexao</p>
                  <p className={`text-xs mt-0.5 ${s.isDark ? "text-red-400/70" : "text-red-600"}`}>{conn.error}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Configuration ═══ */}
      <div className={cardCls}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`h-9 w-9 rounded-xl ${s.isDark ? "bg-violet-500/10" : "bg-violet-50"} flex items-center justify-center`}>
            <Settings className="h-4.5 w-4.5 text-violet-500" />
          </div>
          <div>
            <h3 className={`text-sm font-bold ${s.textPrimary}`}>Configuracao</h3>
            <p className={`text-[11px] ${s.textMuted}`}>Repositorio, token de acesso e versao</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Row 1: Repo + Version */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className={labelCls}>Repositorio GitHub *</label>
              <div className="relative">
                <Github className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${s.textMuted}`} />
                <input value={repoUrl}
                  onChange={(e) => { setRepoUrl(e.target.value); setConfigDirty(true); }}
                  placeholder="owner/repo ou https://github.com/owner/repo"
                  className={`${inputCls} pl-10`}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Versao Actual</label>
              <div className="relative">
                <Tag className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${s.textMuted}`} />
                <input value={currentVer}
                  onChange={(e) => { setCurrentVer(e.target.value); setConfigDirty(true); }}
                  placeholder="1.0.0" className={`${inputCls} pl-10`}
                />
              </div>
            </div>
          </div>

          {/* Row 2: Token */}
          <div>
            <label className={labelCls}>
              <Key className="inline h-3 w-3 mr-1" />
              Token GitHub (Personal Access Token)
              {config?.has_token && <span className="ml-2 text-[10px] font-normal text-emerald-500">Configurado</span>}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showToken ? "text" : "password"}
                  value={ghToken}
                  onChange={(e) => { setGhToken(e.target.value); setConfigDirty(true); }}
                  placeholder={config?.has_token ? "Token guardado (deixe vazio para manter)" : "ghp_xxxxxxxxxxxx"}
                  className={inputCls}
                />
                <button onClick={() => setShowToken(!showToken)} type="button"
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${s.textMuted} hover:text-orange-500`}>
                  {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              {config?.has_token && (
                <button onClick={removeToken}
                  className={`px-3 py-2 rounded-xl text-[11px] font-medium ${s.isDark ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-red-50 text-red-600 hover:bg-red-100"} transition-colors`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className={`text-[10px] ${s.textMuted} mt-1`}>
              Necessario para repositorios privados. Gere em GitHub &gt; Settings &gt; Developer Settings &gt; Personal Access Tokens.
            </p>
          </div>
        </div>

        {/* Actions bar */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-dashed" style={{ borderColor: s.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
          <div className={`text-[10px] ${s.textMuted} space-y-0.5`}>
            {config?.last_check && (
              <p className="flex items-center gap-1"><Clock className="h-3 w-3" /> Verificado: {fmtDate(config.last_check)}</p>
            )}
            {config?.last_install && (
              <p className="flex items-center gap-1"><Rocket className="h-3 w-3" /> Instalado: {fmtDate(config.last_install)}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={testConnection} disabled={testing || !repoUrl}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium ${s.btnSecondary} disabled:opacity-40`}>
              {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5" />}
              Testar Conexao
            </button>
            <button onClick={saveConfig} disabled={saving || !repoUrl}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40 transition-colors ${configDirty ? "ring-2 ring-orange-500/30" : ""}`}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Guardar
            </button>
          </div>
        </div>
      </div>

      {/* ═══ Releases ═══ */}
      <div className={cardCls}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`h-9 w-9 rounded-xl ${s.isDark ? "bg-emerald-500/10" : "bg-emerald-50"} flex items-center justify-center`}>
              <Package className="h-4.5 w-4.5 text-emerald-500" />
            </div>
            <div>
              <h3 className={`text-sm font-bold ${s.textPrimary}`}>Releases</h3>
              <p className={`text-[11px] ${s.textMuted}`}>{releases.length} release{releases.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <button onClick={() => fetchReleases(true)} disabled={loadingReleases}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium ${s.btnSecondary} disabled:opacity-40`}>
            {loadingReleases ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Actualizar
          </button>
        </div>

        {loadingReleases && releases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Loader2 className={`h-6 w-6 animate-spin ${s.textMuted}`} />
            <p className={`text-xs ${s.textMuted}`}>A carregar releases...</p>
          </div>
        ) : releases.length === 0 ? (
          <div className="text-center py-12">
            <Package className={`h-10 w-10 ${s.textMuted} mx-auto mb-2 opacity-40`} />
            <p className={`text-xs ${s.textMuted}`}>
              {repoUrl ? "Nenhuma release encontrada. Verifique a conexao." : "Configure e guarde o repositorio primeiro."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {releases.map((rel) => {
              const newer = isNewer(rel.tag_name);
              const isCurrent = rel.tag_name.replace(/^[vV]/, "") === currentVer.replace(/^[vV]/, "");
              const expanded = expandedRelease === rel.id;

              return (
                <div key={rel.id} className={`rounded-xl border ${s.borderLight} overflow-hidden transition-all ${
                  isCurrent ? (s.isDark ? "border-emerald-500/30 bg-emerald-500/5" : "border-emerald-200 bg-emerald-50/50") :
                  newer ? (s.isDark ? "border-blue-500/20 bg-blue-500/5" : "border-blue-100 bg-blue-50/30") : ""
                }`}>
                  <button
                    onClick={() => setExpandedRelease(expanded ? null : rel.id)}
                    className={`w-full flex items-center gap-3 p-3.5 text-left ${s.isDark ? "hover:bg-white/[0.02]" : "hover:bg-gray-50/50"} transition-colors`}
                  >
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                      isCurrent ? "bg-emerald-500/10" : newer ? "bg-blue-500/10" : (s.isDark ? "bg-white/5" : "bg-gray-100")
                    }`}>
                      <Tag className={`h-4 w-4 ${isCurrent ? "text-emerald-500" : newer ? "text-blue-500" : s.textMuted}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold ${s.textPrimary}`}>{rel.name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                          isCurrent ? "bg-emerald-500/10 text-emerald-600" :
                          newer ? "bg-blue-500/10 text-blue-600" :
                          (s.isDark ? "bg-white/5 text-white/40" : "bg-gray-100 text-gray-500")
                        }`}>{rel.tag_name}</span>
                        {rel.prerelease && (
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${s.isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600"}`}>Pre-release</span>
                        )}
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/10 text-emerald-600 flex items-center gap-0.5">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Instalada
                          </span>
                        )}
                        {newer && !isCurrent && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-500/10 text-blue-600 flex items-center gap-0.5">
                            <ArrowUpRight className="h-2.5 w-2.5" /> Nova
                          </span>
                        )}
                      </div>
                      <p className={`text-[10px] ${s.textMuted} mt-0.5`}>
                        {rel.author.login} · {fmtDate(rel.published_at)}
                      </p>
                    </div>

                    {expanded ? <ChevronUp className={`h-4 w-4 ${s.textMuted}`} /> : <ChevronDown className={`h-4 w-4 ${s.textMuted}`} />}
                  </button>

                  {expanded && (
                    <div className={`px-3.5 pb-3.5 border-t ${s.borderLight}`}>
                      {rel.body && (
                        <div className={`mt-3 p-3 rounded-lg ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}>
                          <p className={`text-[10px] ${s.textMuted} uppercase tracking-wider mb-1.5`}>Changelog</p>
                          <div className={`text-xs ${s.textSecondary} whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto`}>{rel.body}</div>
                        </div>
                      )}

                      {rel.assets.length > 0 && (
                        <div className="mt-3">
                          <p className={`text-[10px] ${s.textMuted} uppercase tracking-wider mb-1.5`}>Downloads</p>
                          <div className="space-y-1.5">
                            {rel.assets.map((a, ai) => (
                              <a key={ai} href={a.url} target="_blank" rel="noopener noreferrer"
                                className={`flex items-center gap-3 p-2.5 rounded-lg ${s.isDark ? "bg-white/[0.03] hover:bg-white/[0.05]" : "bg-white hover:bg-gray-50"} border ${s.borderLight} transition-colors`}>
                                <Download className={`h-3.5 w-3.5 ${s.textMuted}`} />
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs font-medium ${s.textPrimary} truncate`}>{a.name}</p>
                                  <p className={`text-[10px] ${s.textMuted}`}>{fmtBytes(a.size)} · {a.downloads} downloads</p>
                                </div>
                                <ExternalLink className={`h-3 w-3 ${s.textMuted}`} />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Install progress */}
                      {(installing === rel.tag_name || (installResult && expandedRelease === rel.id && installSteps.length > 0)) && (
                        <div className={`mt-3 rounded-xl p-3 ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"} space-y-2`}>
                          <p className={`text-[10px] ${s.textMuted} uppercase tracking-wider font-bold mb-2`}>
                            {installing === rel.tag_name ? "A instalar..." : "Resultado"}
                          </p>
                          {installSteps.map((st, i) => {
                            const Icon = stepIcons[st.step] || Package;
                            return (
                              <div key={i} className={`flex items-start gap-2 text-xs ${
                                st.status === "done" ? (s.isDark ? "text-emerald-400" : "text-emerald-600") :
                                st.status === "running" ? (s.isDark ? "text-blue-400" : "text-blue-600") :
                                (s.isDark ? "text-red-400" : "text-red-600")
                              }`}>
                                {st.status === "running" ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 mt-0.5" /> :
                                 st.status === "done" ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" /> :
                                 <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
                                <span className="break-all">{st.message}</span>
                              </div>
                            );
                          })}
                          {installResult && (
                            <div className={`mt-2 p-2.5 rounded-lg border ${
                              installResult.success
                                ? (s.isDark ? "border-emerald-500/20 bg-emerald-500/5" : "border-emerald-200 bg-emerald-50")
                                : (s.isDark ? "border-red-500/20 bg-red-500/5" : "border-red-200 bg-red-50")
                            }`}>
                              <p className={`text-xs font-semibold ${
                                installResult.success ? (s.isDark ? "text-emerald-400" : "text-emerald-700") : (s.isDark ? "text-red-400" : "text-red-700")
                              }`}>{installResult.message}</p>
                              {installResult.files_copied !== undefined && (
                                <p className={`text-[10px] ${s.textMuted} mt-1`}>{installResult.files_copied} copiados, {installResult.files_skipped} protegidos</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        <a href={rel.html_url} target="_blank" rel="noopener noreferrer"
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium ${s.btnSecondary}`}>
                          <Github className="h-3 w-3" /> GitHub
                        </a>
                        <button onClick={() => { navigator.clipboard.writeText(rel.zipball_url); toast.success("Link copiado"); }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium ${s.btnSecondary}`}>
                          <Copy className="h-3 w-3" /> Copiar ZIP
                        </button>
                        {!isCurrent && (
                          <>
                            <button onClick={() => setConfirmModal(rel)} disabled={!!installing}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40 transition-colors ml-auto shadow-sm">
                              {installing === rel.tag_name ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
                              {installing === rel.tag_name ? "A instalar..." : "Instalar"}
                            </button>
                            <button onClick={() => markVersion(rel.tag_name.replace(/^[vV]/, ""))} disabled={settingVersion === rel.tag_name || !!installing}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium ${s.btnSecondary} disabled:opacity-40`}>
                              {settingVersion === rel.tag_name ? <Loader2 className="h-3 w-3 animate-spin" /> : <Tag className="h-3 w-3" />}
                              Marcar instalada
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ Instructions ═══ */}
      <div className={cardCls}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`h-9 w-9 rounded-xl ${s.isDark ? "bg-blue-500/10" : "bg-blue-50"} flex items-center justify-center`}>
            <Info className="h-4.5 w-4.5 text-blue-500" />
          </div>
          <h3 className={`text-sm font-bold ${s.textPrimary}`}>Como Usar</h3>
        </div>
        <div className={`rounded-xl p-4 ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"} space-y-2.5 text-xs ${s.textSecondary}`}>
          {[
            "Preencha o repositorio (ex: owner/repo) e o token GitHub",
            'Clique "Guardar" — o sistema salva na base de dados',
            '"Testar Conexao" verifica se o repositorio e token sao validos',
            'Clique "Instalar" numa release para actualizar automaticamente',
            "Ficheiros .env sao preservados, migracoes e caches sao executados",
          ].map((txt, i) => (
            <div key={i} className="flex gap-3">
              <span className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
              <p>{txt}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ Confirm Modal ═══ */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setConfirmModal(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-md rounded-2xl border ${s.card} ${s.borderLight} shadow-2xl overflow-hidden`}>
            <div className={`p-5 border-b ${s.borderLight}`}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Rocket className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${s.textPrimary}`}>Instalar {confirmModal.tag_name}</h3>
                  <p className={`text-[11px] ${s.textMuted}`}>{confirmModal.name}</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div className="space-y-2">
                {[
                  { icon: FileDown, text: "Descarregar ficheiros", color: "text-blue-500" },
                  { icon: FolderSync, text: "Copiar para o servidor", color: "text-orange-500" },
                  { icon: Shield, text: "Preservar .env", color: "text-emerald-500" },
                  { icon: Database, text: "Executar migracoes", color: "text-violet-500" },
                  { icon: Trash2, text: "Limpar caches", color: "text-rose-500" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <item.icon className={`h-3.5 w-3.5 ${item.color} shrink-0`} />
                    <span className={`text-xs ${s.textSecondary}`}>{item.text}</span>
                  </div>
                ))}
              </div>
              <div className={`p-3 rounded-xl ${s.isDark ? "bg-amber-500/5 border border-amber-500/20" : "bg-amber-50 border border-amber-200"}`}>
                <p className={`text-[11px] font-medium ${s.isDark ? "text-amber-400" : "text-amber-700"}`}>
                  <AlertTriangle className="inline h-3 w-3 mr-1" /> Faca backup antes de continuar.
                </p>
              </div>
            </div>
            <div className={`p-4 border-t ${s.borderLight} flex justify-end gap-2`}>
              <button onClick={() => setConfirmModal(null)}
                className={`px-4 py-2 rounded-xl text-xs font-medium ${s.btnSecondary}`}>Cancelar</button>
              <button onClick={() => installRelease(confirmModal)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm">
                <Rocket className="h-3.5 w-3.5" /> Instalar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
