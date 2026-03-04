import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import { useEffect, useState } from "react";
import { useToastNotification } from "@/contexts/ToastContext";
import {
  Github, Loader2, RefreshCw, Tag, Download, ExternalLink, Star, GitFork,
  Shield, Clock, CheckCircle2, AlertTriangle, Settings,
  ArrowUpRight, Package, Globe, ChevronDown, ChevronUp, Copy, Info,
  Rocket, XCircle, Database, FolderSync, FileDown, Trash2
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
  tarball_url: string;
  zipball_url: string;
  author: { login: string; avatar_url: string };
  assets: { id: number; name: string; size: number; download_count: number; browser_download_url: string; content_type: string }[];
}

interface RepoInfo {
  full_name: string;
  description: string;
  html_url: string;
  default_branch: string;
  stars: number;
  forks: number;
  open_issues: number;
  language: string;
  updated_at: string;
  private: boolean;
  owner: { login: string; avatar_url: string };
}

interface Config {
  github_repo: string;
  github_token: string;
  has_token: boolean;
  current_version: string;
  last_check: string | null;
  auto_check: boolean;
}

export default function SystemUpdate() {
  const { token } = useAuth();
  const s = useAdminStyles();
  const toast = useToastNotification();

  const [config, setConfig] = useState<Config | null>(null);
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingReleases, setLoadingReleases] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedRelease, setExpandedRelease] = useState<number | null>(null);
  const [settingVersion, setSettingVersion] = useState<string | null>(null);
  const [installing, setInstalling] = useState<string | null>(null);
  const [installSteps, setInstallSteps] = useState<{step:string;status:string;message:string}[]>([]);
  const [installResult, setInstallResult] = useState<{success:boolean;message:string;version?:string;files_copied?:number;files_skipped?:number} | null>(null);
  const [confirmModal, setConfirmModal] = useState<Release | null>(null);

  // Form state
  const [repoUrl, setRepoUrl] = useState("");
  const [currentVer, setCurrentVer] = useState("");

  const hdrs: Record<string, string> = { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" };

  const formatDate = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString("pt", { day: "2-digit", month: "short", year: "numeric" }) + " " +
      dt.toLocaleTimeString("pt", { hour: "2-digit", minute: "2-digit" });
  };

  const formatBytes = (b: number) => {
    if (b < 1024) return b + " B";
    if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
    return (b / 1048576).toFixed(1) + " MB";
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API}/admin/system-update/config`, { headers: hdrs });
      const data = await res.json();
      setConfig(data);
      setRepoUrl(data.github_repo || "");
      setCurrentVer(data.current_version || "1.0.0");
    } catch { toast.error("Erro ao carregar configuracao"); }
  };

  const fetchRepoInfo = async () => {
    try {
      const res = await fetch(`${API}/admin/system-update/repo-info`, { headers: hdrs });
      if (res.ok) setRepoInfo(await res.json());
    } catch {}
  };

  const fetchReleases = async () => {
    setLoadingReleases(true);
    try {
      const res = await fetch(`${API}/admin/system-update/releases`, { headers: hdrs });
      const data = await res.json();
      if (res.ok) {
        setReleases(data.releases || []);
        if (data.current_version) setCurrentVer(data.current_version);
      } else {
        toast.error("Erro", data.error || "Erro ao carregar releases");
      }
    } catch { toast.error("Erro de conexao"); }
    finally { setLoadingReleases(false); }
  };

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetchConfig().then(() => {
      fetchRepoInfo();
      fetchReleases();
    }).finally(() => setLoading(false));
  }, [token]);

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/admin/system-update/config`, {
        method: "PUT", headers: hdrs,
        body: JSON.stringify({ github_repo: repoUrl, current_version: currentVer }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Guardado", data.message);
        await fetchConfig();
        await fetchRepoInfo();
        await fetchReleases();
      } else toast.error("Erro", data.message || "Erro ao guardar");
    } catch { toast.error("Erro de conexao"); }
    finally { setSaving(false); }
  };

  const markVersion = async (version: string) => {
    setSettingVersion(version);
    try {
      const res = await fetch(`${API}/admin/system-update/set-version`, {
        method: "PUT", headers: hdrs,
        body: JSON.stringify({ version }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Versao actualizada", data.message);
        setCurrentVer(version);
        setConfig(prev => prev ? { ...prev, current_version: version } : prev);
      } else toast.error("Erro", data.message);
    } catch { toast.error("Erro de conexao"); }
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
        setInstallResult({ success: true, message: data.message, version: data.version, files_copied: data.files_copied, files_skipped: data.files_skipped });
        setCurrentVer(data.version || rel.tag_name.replace(/^[vV]/, ""));
        setConfig(prev => prev ? { ...prev, current_version: data.version || rel.tag_name.replace(/^[vV]/, "") } : prev);
        toast.success("Instalado!", data.message);
      } else {
        setInstallResult({ success: false, message: data.error || "Erro na instalacao" });
        toast.error("Erro", data.error || "Falha na instalacao");
      }
    } catch (e) {
      setInstallResult({ success: false, message: "Erro de conexao ao servidor" });
      toast.error("Erro de conexao");
    } finally { setInstalling(null); }
  };

  const askInstall = (rel: Release) => setConfirmModal(rel);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const isNewer = (tag: string) => {
    const clean = (v: string) => v.replace(/^[vV]/, "");
    const parts = (v: string) => v.split(".").map(Number);
    const a = parts(clean(tag));
    const b = parts(clean(currentVer));
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if ((a[i] || 0) > (b[i] || 0)) return true;
      if ((a[i] || 0) < (b[i] || 0)) return false;
    }
    return false;
  };

  const cardCls = `rounded-2xl border ${s.card} p-5`;
  const inputCls = `w-full ${s.input} border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20`;
  const labelCls = `text-xs font-semibold ${s.textPrimary} mb-1.5 block`;

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
      <div>
        <h2 className={`text-lg font-bold ${s.textPrimary}`}>Actualizacao do Sistema</h2>
        <p className={`text-xs ${s.textMuted}`}>Gerir versoes e actualizacoes via GitHub</p>
      </div>

      {/* ═══ Repo Info Card ═══ */}
      {repoInfo && (
        <div className={cardCls}>
          <div className="flex items-start gap-4">
            <img src={repoInfo.owner.avatar_url} alt="" className="h-12 w-12 rounded-xl" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={`text-sm font-bold ${s.textPrimary}`}>{repoInfo.full_name}</h3>
                {repoInfo.private && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600"}`}>
                    <Shield className="inline h-2.5 w-2.5 mr-0.5" /> Privado
                  </span>
                )}
                <a href={repoInfo.html_url} target="_blank" rel="noopener noreferrer"
                  className={`text-[10px] ${s.textMuted} hover:text-orange-500 flex items-center gap-0.5`}>
                  <ExternalLink className="h-2.5 w-2.5" /> GitHub
                </a>
              </div>
              {repoInfo.description && <p className={`text-xs ${s.textMuted} mt-1`}>{repoInfo.description}</p>}
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                <span className={`text-[11px] ${s.textMuted} flex items-center gap-1`}><Star className="h-3 w-3 text-amber-500" /> {repoInfo.stars}</span>
                <span className={`text-[11px] ${s.textMuted} flex items-center gap-1`}><GitFork className="h-3 w-3" /> {repoInfo.forks}</span>
                <span className={`text-[11px] ${s.textMuted} flex items-center gap-1`}><AlertTriangle className="h-3 w-3" /> {repoInfo.open_issues} issues</span>
                {repoInfo.language && <span className={`text-[11px] ${s.textMuted} flex items-center gap-1`}><Globe className="h-3 w-3" /> {repoInfo.language}</span>}
                <span className={`text-[11px] ${s.textMuted} flex items-center gap-1`}><Clock className="h-3 w-3" /> {formatDate(repoInfo.updated_at)}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${
                isNewer(releases[0]?.tag_name || "0.0.0")
                  ? (s.isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600")
                  : (s.isDark ? "bg-white/5 text-white/60" : "bg-gray-100 text-gray-600")
              }`}>
                <Tag className="h-3 w-3" />
                {currentVer}
              </div>
              <p className={`text-[10px] ${s.textMuted} mt-1`}>Versao actual</p>
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
            <h3 className={`text-sm font-bold ${s.textPrimary}`}>Configuracao do Repositorio</h3>
            <p className={`text-[11px] ${s.textMuted}`}>Link do repositorio GitHub e token de acesso</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Repositorio GitHub</label>
            <div className="relative">
              <Github className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${s.textMuted}`} />
              <input
                value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="owner/repo ou https://github.com/owner/repo"
                className={`${inputCls} pl-10`}
              />
            </div>
            <p className={`text-[10px] ${s.textMuted} mt-1`}>Ex: softecangola/superlojas</p>
          </div>

          <div>
            <label className={labelCls}>Versao Actual</label>
            <div className="relative">
              <Tag className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${s.textMuted}`} />
              <input
                value={currentVer} onChange={(e) => setCurrentVer(e.target.value)}
                placeholder="1.0.0"
                className={`${inputCls} pl-10`}
              />
            </div>
            <p className={`text-[10px] ${s.textMuted} mt-1`}>Versao instalada actualmente</p>
          </div>

        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-dashed" style={{ borderColor: s.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
          {config?.last_check && (
            <p className={`text-[10px] ${s.textMuted} flex items-center gap-1`}>
              <Clock className="h-3 w-3" /> Ultima verificacao: {formatDate(config.last_check)}
            </p>
          )}
          <button onClick={saveConfig} disabled={saving || !repoUrl}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40 transition-colors ml-auto">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Guardar Configuracao
          </button>
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
              <h3 className={`text-sm font-bold ${s.textPrimary}`}>Releases Disponiveis</h3>
              <p className={`text-[11px] ${s.textMuted}`}>{releases.length} release{releases.length !== 1 ? "s" : ""} encontrada{releases.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <button onClick={fetchReleases} disabled={loadingReleases}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium ${s.btnSecondary} disabled:opacity-40`}>
            {loadingReleases ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Verificar
          </button>
        </div>

        {loadingReleases && releases.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className={`h-6 w-6 animate-spin ${s.textMuted}`} />
          </div>
        ) : releases.length === 0 ? (
          <div className="text-center py-12">
            <Package className={`h-10 w-10 ${s.textMuted} mx-auto mb-2 opacity-40`} />
            <p className={`text-xs ${s.textMuted}`}>
              {repoUrl ? "Nenhuma release encontrada" : "Configure o repositorio primeiro"}
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
                  {/* Release header */}
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
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${s.isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600"}`}>
                            Pre-release
                          </span>
                        )}
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/10 text-emerald-600 flex items-center gap-0.5">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Actual
                          </span>
                        )}
                        {newer && !isCurrent && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-500/10 text-blue-600 flex items-center gap-0.5">
                            <ArrowUpRight className="h-2.5 w-2.5" /> Nova
                          </span>
                        )}
                      </div>
                      <p className={`text-[10px] ${s.textMuted} mt-0.5`}>
                        {rel.author.login} • {formatDate(rel.published_at)}
                        {rel.assets.length > 0 && ` • ${rel.assets.length} ficheiro${rel.assets.length > 1 ? "s" : ""}`}
                      </p>
                    </div>

                    {expanded ? <ChevronUp className={`h-4 w-4 ${s.textMuted}`} /> : <ChevronDown className={`h-4 w-4 ${s.textMuted}`} />}
                  </button>

                  {/* Release detail */}
                  {expanded && (
                    <div className={`px-3.5 pb-3.5 border-t ${s.borderLight}`}>
                      {/* Body / changelog */}
                      {rel.body && (
                        <div className={`mt-3 p-3 rounded-lg ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}>
                          <p className={`text-[10px] ${s.textMuted} uppercase tracking-wider mb-1.5`}>Changelog</p>
                          <div className={`text-xs ${s.textSecondary} whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto`}>
                            {rel.body}
                          </div>
                        </div>
                      )}

                      {/* Assets / downloads */}
                      {rel.assets.length > 0 && (
                        <div className="mt-3">
                          <p className={`text-[10px] ${s.textMuted} uppercase tracking-wider mb-1.5`}>Ficheiros para download</p>
                          <div className="space-y-1.5">
                            {rel.assets.map((asset) => (
                              <a key={asset.id} href={asset.browser_download_url} target="_blank" rel="noopener noreferrer"
                                className={`flex items-center gap-3 p-2.5 rounded-lg ${s.isDark ? "bg-white/[0.03] hover:bg-white/[0.05]" : "bg-white hover:bg-gray-50"} border ${s.borderLight} transition-colors`}>
                                <Download className={`h-3.5 w-3.5 ${s.textMuted} shrink-0`} />
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs font-medium ${s.textPrimary} truncate`}>{asset.name}</p>
                                  <p className={`text-[10px] ${s.textMuted}`}>{formatBytes(asset.size)} • {asset.download_count} downloads</p>
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
                            {installing === rel.tag_name ? "A instalar..." : "Resultado da instalacao"}
                          </p>
                          {installSteps.map((st, i) => {
                            const stepIcons: Record<string, typeof Rocket> = {
                              download: FileDown, extract: FolderSync, backup: Shield,
                              copy: FolderSync, migrate: Database, seed: Database, cache: Trash2, version: Tag,
                            };
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
                              }`}>
                                {installResult.success ? "✓ " : "✗ "}{installResult.message}
                              </p>
                              {installResult.files_copied !== undefined && (
                                <p className={`text-[10px] ${s.textMuted} mt-1`}>
                                  {installResult.files_copied} ficheiros copiados, {installResult.files_skipped} protegidos
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <a href={rel.html_url} target="_blank" rel="noopener noreferrer"
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium ${s.btnSecondary}`}>
                          <Github className="h-3 w-3" /> Ver no GitHub
                        </a>
                        <button onClick={() => copyToClipboard(rel.zipball_url)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium ${s.btnSecondary}`}>
                          <Copy className="h-3 w-3" /> Copiar link
                        </button>

                        {!isCurrent && (
                          <>
                            <button onClick={() => askInstall(rel)} disabled={!!installing}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40 transition-colors ml-auto shadow-sm">
                              {installing === rel.tag_name ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
                              {installing === rel.tag_name ? "A instalar..." : "Instalar Agora"}
                            </button>
                            <button onClick={() => markVersion(rel.tag_name)} disabled={settingVersion === rel.tag_name || !!installing}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium ${s.btnSecondary} disabled:opacity-40`}>
                              {settingVersion === rel.tag_name ? <Loader2 className="h-3 w-3 animate-spin" /> : <Tag className="h-3 w-3" />}
                              Marcar como instalado
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

      {/* ═══ Update Instructions ═══ */}
      <div className={cardCls}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`h-9 w-9 rounded-xl ${s.isDark ? "bg-blue-500/10" : "bg-blue-50"} flex items-center justify-center`}>
            <Info className="h-4.5 w-4.5 text-blue-500" />
          </div>
          <div>
            <h3 className={`text-sm font-bold ${s.textPrimary}`}>Como Actualizar</h3>
            <p className={`text-[11px] ${s.textMuted}`}>O sistema actualiza automaticamente com 1 clique</p>
          </div>
        </div>
        <div className={`rounded-xl p-4 ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"} space-y-3 text-xs ${s.textSecondary}`}>
          <div className="flex gap-3">
            <span className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
            <p>Clique em <strong>"Instalar Agora"</strong> na release desejada</p>
          </div>
          <div className="flex gap-3">
            <span className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
            <p>O sistema descarrega, extrai e copia automaticamente os ficheiros novos</p>
          </div>
          <div className="flex gap-3">
            <span className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
            <p>Os ficheiros <code className="px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-600">.env</code> e <code className="px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-600">api/.env</code> sao preservados automaticamente</p>
          </div>
          <div className="flex gap-3">
            <span className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold flex items-center justify-center shrink-0">4</span>
            <p>Migracoes Laravel e seeders sao executados automaticamente</p>
          </div>
          <div className="flex gap-3">
            <span className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold flex items-center justify-center shrink-0">5</span>
            <p>Caches sao limpos e a versao e actualizada. <strong>Tudo pronto!</strong></p>
          </div>
        </div>
      </div>

      {/* ═══ Confirm Install Modal ═══ */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setConfirmModal(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-md rounded-2xl border ${s.card} ${s.borderLight} shadow-2xl overflow-hidden`}>
            {/* Header */}
            <div className={`p-5 border-b ${s.borderLight}`}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Rocket className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${s.textPrimary}`}>Instalar Actualizacao</h3>
                  <p className={`text-[11px] ${s.textMuted}`}>Versao {confirmModal.tag_name}</p>
                </div>
              </div>
            </div>
            {/* Body */}
            <div className="p-5 space-y-3">
              <p className={`text-xs ${s.textSecondary}`}>Esta accao ira:</p>
              <div className="space-y-2">
                {[
                  { icon: FileDown, text: "Descarregar os ficheiros da release", color: "text-blue-500" },
                  { icon: FolderSync, text: "Sobrescrever ficheiros existentes", color: "text-orange-500" },
                  { icon: Shield, text: "Preservar .env e api/.env", color: "text-emerald-500" },
                  { icon: Database, text: "Executar migracoes e seeders", color: "text-violet-500" },
                  { icon: Trash2, text: "Limpar caches do sistema", color: "text-rose-500" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <item.icon className={`h-3.5 w-3.5 ${item.color} shrink-0`} />
                    <span className={`text-xs ${s.textSecondary}`}>{item.text}</span>
                  </div>
                ))}
              </div>
              <div className={`mt-3 p-3 rounded-xl ${s.isDark ? "bg-amber-500/5 border border-amber-500/20" : "bg-amber-50 border border-amber-200"}`}>
                <p className={`text-[11px] font-medium ${s.isDark ? "text-amber-400" : "text-amber-700"}`}>
                  <AlertTriangle className="inline h-3 w-3 mr-1" />
                  Certifique-se de que tem um backup recente antes de continuar.
                </p>
              </div>
            </div>
            {/* Footer */}
            <div className={`p-4 border-t ${s.borderLight} flex justify-end gap-2`}>
              <button onClick={() => setConfirmModal(null)}
                className={`px-4 py-2 rounded-xl text-xs font-medium ${s.btnSecondary}`}>
                Cancelar
              </button>
              <button onClick={() => installRelease(confirmModal)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm">
                <Rocket className="h-3.5 w-3.5" /> Instalar {confirmModal.tag_name}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
