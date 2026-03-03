import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import { useEffect, useState, useRef } from "react";
import {
  Mail, Loader2, CheckCircle2, XCircle, Clock, Send, Eye, RefreshCw,
  Search, Filter, Trash2, BarChart3, AlertTriangle, ChevronLeft, ChevronRight,
  Play, X
} from "lucide-react";
import { useToastNotification } from "@/contexts/ToastContext";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

interface EmailLogItem {
  id: number;
  to: string;
  subject: string;
  template: string;
  status: "sent" | "failed" | "pending";
  error: string | null;
  duration_ms: number | null;
  created_at: string;
}

interface Stats {
  total: number; sent: number; failed: number; pending: number;
  today: number; today_sent: number; today_failed: number; avg_duration: number;
}

interface Template {
  key: string; label: string; description: string;
  sampleData: Record<string, unknown>; sampleSubject: string;
}

type ViewMode = "logs" | "templates";

export default function AdminEmailLogs() {
  const { token } = useAuth();
  const s = useAdminStyles();
  const toast = useToastNotification();

  const [view, setView] = useState<ViewMode>("logs");
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<EmailLogItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTemplate, setFilterTemplate] = useState("all");
  const [searchQ, setSearchQ] = useState("");

  // Test/Preview
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState("");
  const [retrying, setRetrying] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const hdrs = { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" };

  // ─── Fetch ───
  const fetchLogs = async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), per_page: "20" });
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterTemplate !== "all") params.set("template", filterTemplate);
      if (searchQ) params.set("search", searchQ);
      const res = await fetch(`${API}/admin/email-logs?${params}`, { headers: hdrs });
      const d = await res.json();
      setLogs(d.data || []);
      setPage(d.current_page || 1);
      setLastPage(d.last_page || 1);
      setTotal(d.total || 0);
    } catch { toast.error("Erro ao carregar logs"); }
    finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API}/admin/email-logs/stats`, { headers: hdrs });
      setStats(await res.json());
    } catch {}
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${API}/admin/email-logs/templates`, { headers: hdrs });
      setTemplates(await res.json());
    } catch {}
  };

  useEffect(() => { if (token) { fetchLogs(); fetchStats(); fetchTemplates(); } }, [token]);
  useEffect(() => { if (token) fetchLogs(1); }, [filterStatus, filterTemplate, searchQ]);

  // ─── Actions ───
  const previewTemplate = async (tpl: Template) => {
    try {
      const res = await fetch(`${API}/admin/email-logs/preview`, {
        method: "POST", headers: hdrs,
        body: JSON.stringify({ template: tpl.key, data: tpl.sampleData }),
      });
      const d = await res.json();
      setPreviewHtml(d.html || "");
      setPreviewOpen(true);
      setTimeout(() => {
        if (iframeRef.current) {
          const doc = iframeRef.current.contentDocument;
          if (doc) { doc.open(); doc.write(d.html); doc.close(); }
        }
      }, 100);
    } catch { toast.error("Erro ao carregar preview"); }
  };

  const sendTestEmail = async (tpl: Template) => {
    if (!testEmail) { toast.error("Insira um email para teste"); return; }
    setSending(tpl.key);
    try {
      const res = await fetch(`${API}/admin/email-logs/send-test`, {
        method: "POST", headers: hdrs,
        body: JSON.stringify({ template: tpl.key, email: testEmail, subject: `[TESTE] ${tpl.sampleSubject}`, data: tpl.sampleData }),
      });
      const d = await res.json();
      if (res.ok) { toast.success("Enviado", d.message); fetchLogs(page); fetchStats(); }
      else toast.error("Falha", d.message);
    } catch { toast.error("Erro de conexao"); }
    finally { setSending(""); }
  };

  const retryEmail = async (id: number) => {
    setRetrying(id);
    try {
      const res = await fetch(`${API}/admin/email-logs/${id}/retry`, { method: "POST", headers: hdrs });
      const d = await res.json();
      if (res.ok) { toast.success("Reenviado", d.message); fetchLogs(page); fetchStats(); }
      else toast.error("Falha", d.message);
    } catch { toast.error("Erro"); }
    finally { setRetrying(0); }
  };

  // ─── Helpers ───
  const inputCls = `w-full ${s.input} border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20`;
  const cardCls = `rounded-2xl border ${s.card} p-5`;
  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      sent: { bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-600", icon: <CheckCircle2 className="h-3 w-3" /> },
      failed: { bg: "bg-red-50 dark:bg-red-500/10", text: "text-red-600", icon: <XCircle className="h-3 w-3" /> },
      pending: { bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-600", icon: <Clock className="h-3 w-3" /> },
    };
    const m = map[status] || map.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${m.bg} ${m.text}`}>
        {m.icon} {status.toUpperCase()}
      </span>
    );
  };

  const formatDate = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString("pt", { day: "2-digit", month: "2-digit", year: "2-digit" }) + " " +
           dt.toLocaleTimeString("pt", { hour: "2-digit", minute: "2-digit" });
  };

  // ─── Stats cards ───
  const StatCard = ({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) => (
    <div className={`${cardCls} flex items-center gap-3`}>
      <div className={`h-10 w-10 rounded-xl ${s.isDark ? `${color.replace("text-","bg-")}/10` : `${color.replace("text-","bg-")}/10`} flex items-center justify-center`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div>
        <p className={`text-lg font-bold ${s.textPrimary}`}>{value}</p>
        <p className={`text-[10px] ${s.textMuted}`}>{label}</p>
      </div>
    </div>
  );

  if (loading && logs.length === 0) return (
    <div className="space-y-4 max-w-5xl">
      {[...Array(3)].map((_, i) => (
        <div key={i} className={`rounded-2xl border ${s.card} p-6 animate-pulse`}>
          <div className={`h-5 w-40 ${s.skeleton} rounded mb-4`} />
          <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, j) => <div key={j} className={`h-10 ${s.skeleton} rounded-xl`} />)}</div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-bold ${s.textPrimary}`}>Email Logs & Templates</h2>
          <p className={`text-xs ${s.textMuted}`}>Historico de envios e area de teste de templates</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView("logs")} className={`px-3.5 py-2 rounded-xl text-xs font-medium ${view === "logs" ? "bg-orange-500 text-white" : s.btnSecondary}`}>
            <Mail className="h-3.5 w-3.5 inline mr-1" /> Logs
          </button>
          <button onClick={() => setView("templates")} className={`px-3.5 py-2 rounded-xl text-xs font-medium ${view === "templates" ? "bg-orange-500 text-white" : s.btnSecondary}`}>
            <Play className="h-3.5 w-3.5 inline mr-1" /> Testar Templates
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Enviados" value={stats.sent} icon={CheckCircle2} color="text-emerald-500" />
          <StatCard label="Falhados" value={stats.failed} icon={XCircle} color="text-red-500" />
          <StatCard label="Hoje" value={stats.today} icon={BarChart3} color="text-blue-500" />
          <StatCard label="Tempo Medio" value={stats.avg_duration} icon={Clock} color="text-violet-500" />
        </div>
      )}

      {/* ═══════════ LOGS VIEW ═══════════ */}
      {view === "logs" && (
        <div className={cardCls}>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className={`h-4 w-4 ${s.textMuted}`} />
              <input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Pesquisar por email ou assunto..." className={inputCls} />
            </div>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={`${inputCls} w-auto`}>
              <option value="all">Todos status</option>
              <option value="sent">Enviados</option>
              <option value="failed">Falhados</option>
              <option value="pending">Pendentes</option>
            </select>
            <select value={filterTemplate} onChange={(e) => setFilterTemplate(e.target.value)} className={`${inputCls} w-auto`}>
              <option value="all">Todos templates</option>
              {templates.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
            <button onClick={() => { fetchLogs(page); fetchStats(); }} className={`px-3 py-2 rounded-xl text-xs font-medium ${s.btnSecondary}`}>
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className={`border-b ${s.borderLight}`}>
                  <th className={`text-left py-2.5 px-3 ${s.textMuted} font-semibold`}>Destinatario</th>
                  <th className={`text-left py-2.5 px-3 ${s.textMuted} font-semibold`}>Assunto</th>
                  <th className={`text-left py-2.5 px-3 ${s.textMuted} font-semibold`}>Template</th>
                  <th className={`text-left py-2.5 px-3 ${s.textMuted} font-semibold`}>Status</th>
                  <th className={`text-left py-2.5 px-3 ${s.textMuted} font-semibold`}>Tempo</th>
                  <th className={`text-left py-2.5 px-3 ${s.textMuted} font-semibold`}>Data</th>
                  <th className={`text-right py-2.5 px-3 ${s.textMuted} font-semibold`}>Accoes</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 && (
                  <tr><td colSpan={7} className={`text-center py-12 ${s.textMuted}`}>Nenhum registo encontrado</td></tr>
                )}
                {logs.map((log) => (
                  <tr key={log.id} className={`border-b ${s.borderLight} hover:${s.isDark ? "bg-white/[0.02]" : "bg-gray-50"} transition-colors`}>
                    <td className={`py-2.5 px-3 ${s.textPrimary} font-medium truncate max-w-[160px]`}>{log.to}</td>
                    <td className={`py-2.5 px-3 ${s.textSecondary} truncate max-w-[200px]`}>{log.subject}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${s.isDark ? "bg-white/5 text-white/70" : "bg-gray-100 text-gray-600"}`}>
                        {log.template}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">{statusBadge(log.status)}</td>
                    <td className={`py-2.5 px-3 ${s.textMuted}`}>{log.duration_ms ? `${log.duration_ms}ms` : "-"}</td>
                    <td className={`py-2.5 px-3 ${s.textMuted} whitespace-nowrap`}>{formatDate(log.created_at)}</td>
                    <td className="py-2.5 px-3 text-right">
                      {log.status === "failed" && (
                        <div className="flex items-center justify-end gap-1">
                          <button title={log.error || "Sem detalhes"} className={`p-1 rounded-lg ${s.textMuted} hover:text-amber-500`}>
                            <AlertTriangle className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => retryEmail(log.id)} disabled={retrying === log.id} className={`p-1 rounded-lg ${s.textMuted} hover:text-emerald-500 disabled:opacity-50`}>
                            {retrying === log.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Error details tooltip on hover */}
          {logs.some(l => l.status === "failed" && l.error) && (
            <div className={`mt-3 p-3 rounded-xl text-[10px] ${s.isDark ? "bg-red-500/5 text-red-400 border border-red-500/10" : "bg-red-50 text-red-700 border border-red-100"}`}>
              <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
              Ultimo erro: {logs.find(l => l.status === "failed")?.error?.substring(0, 200)}
            </div>
          )}

          {/* Pagination */}
          {lastPage > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className={`text-[11px] ${s.textMuted}`}>{total} registos — pagina {page} de {lastPage}</p>
              <div className="flex gap-1">
                <button onClick={() => fetchLogs(page - 1)} disabled={page <= 1} className={`p-2 rounded-lg ${s.btnSecondary} disabled:opacity-30`}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => fetchLogs(page + 1)} disabled={page >= lastPage} className={`p-2 rounded-lg ${s.btnSecondary} disabled:opacity-30`}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ TEMPLATES VIEW ═══════════ */}
      {view === "templates" && (
        <div className="space-y-4">
          {/* Test email input */}
          <div className={cardCls}>
            <div className="flex items-center gap-3">
              <Send className="h-4 w-4 text-orange-500" />
              <span className={`text-xs font-semibold ${s.textPrimary}`}>Email para Testes</span>
            </div>
            <div className="mt-3">
              <input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="email@teste.com" className={inputCls} type="email" />
              <p className={`text-[10px] ${s.textMuted} mt-1`}>Todos os emails de teste serao enviados para este endereco</p>
            </div>
          </div>

          {/* Template cards */}
          <div className="grid grid-cols-1 gap-3">
            {templates.map((tpl) => (
              <div key={tpl.key} className={`${cardCls} flex items-center gap-4`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-medium ${s.isDark ? "bg-white/5 text-white/70" : "bg-gray-100 text-gray-600"}`}>
                      {tpl.key}
                    </span>
                    <h3 className={`text-sm font-semibold ${s.textPrimary}`}>{tpl.label}</h3>
                  </div>
                  <p className={`text-[11px] ${s.textMuted}`}>{tpl.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => previewTemplate(tpl)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium ${s.isDark ? "bg-violet-500/20 text-violet-400 hover:bg-violet-500/30" : "bg-violet-50 text-violet-600 hover:bg-violet-100"} transition-colors`}>
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </button>
                  <button onClick={() => sendTestEmail(tpl)} disabled={sending === tpl.key || !testEmail}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium ${s.isDark ? "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30" : "bg-orange-50 text-orange-600 hover:bg-orange-100"} transition-colors disabled:opacity-40`}>
                    {sending === tpl.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Enviar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════ PREVIEW MODAL ═══════════ */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPreviewOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-800">Preview do Template</h3>
              <button onClick={() => setPreviewOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <iframe ref={iframeRef} title="Email Preview" className="w-full h-full min-h-[500px] border-0" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
