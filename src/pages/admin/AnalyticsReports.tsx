import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Search, Filter, Download, Loader2, Monitor, Smartphone, Tablet,
  Globe, Clock, ExternalLink, ChevronLeft, ChevronRight, RefreshCw, FileText
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

interface LogEntry {
  id: number; path: string; store_slug: string | null; referrer_domain: string | null;
  country: string | null; province: string | null; device: string | null; browser: string | null;
  os: string | null; is_unique_today: boolean; user_id: number | null; created_at: string;
}

interface Pagination { current_page: number; last_page: number; total: number; per_page: number; }

export default function AdminAnalyticsReports() {
  const { token } = useAuth();
  const s = useAdminStyles();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ current_page: 1, last_page: 1, total: 0, per_page: 50 });

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterStore, setFilterStore] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterDevice, setFilterDevice] = useState("");
  const [search, setSearch] = useState("");

  const fetchLogs = useCallback(async (page = 1) => {
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: "50" });
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (filterStore) params.set("store", filterStore);
    if (filterCountry) params.set("country", filterCountry);
    if (filterDevice) params.set("device", filterDevice);
    if (search) params.set("search", search);

    try {
      const res = await fetch(`${API}/admin/analytics/logs?${params}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const data = await res.json();
      setLogs(data.data || []);
      setPagination({
        current_page: data.current_page || 1,
        last_page: data.last_page || 1,
        total: data.total || 0,
        per_page: data.per_page || 50,
      });
    } catch {}
    setLoading(false);
  }, [token, dateFrom, dateTo, filterStore, filterCountry, filterDevice, search]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const clearFilters = () => {
    setDateFrom(""); setDateTo(""); setFilterStore(""); setFilterCountry(""); setFilterDevice(""); setSearch("");
  };

  const inputCls = `${s.input} border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20`;
  const thCls = `text-[10px] font-semibold uppercase tracking-wider ${s.thText} text-left px-3 py-2.5`;
  const tdCls = `px-3 py-2.5 text-xs ${s.textPrimary}`;
  const deviceIcons: Record<string, any> = { desktop: Monitor, mobile: Smartphone, tablet: Tablet };

  const exportCsv = () => {
    if (logs.length === 0) return;
    const header = "Data,Pagina,Loja,Referrer,Pais,Dispositivo,Browser,OS,Unico\n";
    const rows = logs.map(l =>
      `"${l.created_at}","${l.path}","${l.store_slug || ""}","${l.referrer_domain || ""}","${l.country || ""}","${l.device || ""}","${l.browser || ""}","${l.os || ""}","${l.is_unique_today ? "Sim" : "Nao"}"`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `analytics-${new Date().toISOString().split("T")[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/admin/analytics" className={`p-2 rounded-lg ${s.btnSecondary}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h2 className={`text-lg font-bold ${s.textPrimary}`}>Relatorios Detalhados</h2>
            <p className={`text-xs ${s.textMuted}`}>{pagination.total} registos encontrados</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium ${s.btnSecondary}`}>
            <Download className="h-3.5 w-3.5" /> Exportar CSV
          </button>
          <button onClick={() => fetchLogs()} className={`p-2 rounded-lg ${s.btnSecondary}`}>
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={`rounded-2xl border ${s.card} p-4`}>
        <div className="flex items-center gap-2 mb-3">
          <Filter className={`h-4 w-4 ${s.textMuted}`} />
          <span className={`text-xs font-semibold ${s.textSecondary}`}>Filtros</span>
          <button onClick={clearFilters} className={`ml-auto text-[10px] ${s.textMuted} hover:text-orange-500 transition-colors`}>Limpar filtros</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputCls} placeholder="Data inicio" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputCls} placeholder="Data fim" />
          <input type="text" value={filterStore} onChange={(e) => setFilterStore(e.target.value)} placeholder="Loja (slug)" className={inputCls} />
          <input type="text" value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)} placeholder="Pais" className={inputCls} />
          <select value={filterDevice} onChange={(e) => setFilterDevice(e.target.value)} className={inputCls}>
            <option value="">Dispositivo</option>
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile</option>
            <option value="tablet">Tablet</option>
          </select>
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${s.textMuted}`} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar..."
              className={`${inputCls} pl-9`} onKeyDown={(e) => { if (e.key === "Enter") fetchLogs(); }} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className={`rounded-2xl border ${s.card} overflow-hidden`}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className={`h-6 w-6 animate-spin ${s.textMuted}`} />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16">
            <FileText className={`h-10 w-10 mx-auto mb-3 ${s.empty}`} />
            <p className={`text-sm ${s.textMuted}`}>Nenhum registo encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className={`border-b ${s.borderLight}`}>
                  <th className={thCls}>Data</th>
                  <th className={thCls}>Pagina</th>
                  <th className={thCls}>Loja</th>
                  <th className={thCls}>Referrer</th>
                  <th className={thCls}>Pais</th>
                  <th className={thCls}>Disp.</th>
                  <th className={thCls}>Browser</th>
                  <th className={thCls}>OS</th>
                  <th className={thCls}>Unico</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => {
                  const DevIcon = deviceIcons[l.device || ""] || Monitor;
                  return (
                    <tr key={l.id} className={`border-b ${s.borderLight} ${s.hoverRow} transition-colors`}>
                      <td className={`${tdCls} whitespace-nowrap`}>
                        <div className="flex items-center gap-1">
                          <Clock className={`h-3 w-3 ${s.textMuted}`} />
                          <span className={`text-[10px] ${s.textMuted}`}>{new Date(l.created_at).toLocaleString("pt-AO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </td>
                      <td className={`${tdCls} max-w-[200px] truncate`} title={l.path}>{l.path}</td>
                      <td className={tdCls}>
                        {l.store_slug ? (
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${s.isDark ? "bg-orange-500/15 text-orange-400" : "bg-orange-50 text-orange-600"}`}>
                            {l.store_slug}
                          </span>
                        ) : <span className={s.textMuted}>—</span>}
                      </td>
                      <td className={`${tdCls} max-w-[150px] truncate`}>
                        {l.referrer_domain ? (
                          <span className="flex items-center gap-1">
                            <ExternalLink className="h-3 w-3 text-emerald-500 shrink-0" />
                            <span className="truncate">{l.referrer_domain}</span>
                          </span>
                        ) : <span className={s.textMuted}>Directo</span>}
                      </td>
                      <td className={tdCls}>
                        <span className="flex items-center gap-1">
                          <Globe className={`h-3 w-3 ${s.textMuted} shrink-0`} />
                          {l.country || "—"}
                        </span>
                      </td>
                      <td className={tdCls}>
                        <DevIcon className={`h-3.5 w-3.5 ${s.textSecondary}`} title={l.device || ""} />
                      </td>
                      <td className={`${tdCls} text-[10px]`}>{l.browser || "—"}</td>
                      <td className={`${tdCls} text-[10px]`}>{l.os || "—"}</td>
                      <td className={tdCls}>
                        {l.is_unique_today ? (
                          <span className={`h-2 w-2 rounded-full bg-emerald-500 inline-block`} title="Unico hoje" />
                        ) : (
                          <span className={`h-2 w-2 rounded-full ${s.isDark ? "bg-white/10" : "bg-gray-200"} inline-block`} title="Repetido" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.last_page > 1 && (
          <div className={`flex items-center justify-between px-4 py-3 border-t ${s.borderLight}`}>
            <p className={`text-[11px] ${s.textMuted}`}>
              Pagina {pagination.current_page} de {pagination.last_page} ({pagination.total} registos)
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => fetchLogs(pagination.current_page - 1)} disabled={pagination.current_page <= 1}
                className={`p-1.5 rounded-lg ${s.btnSecondary} disabled:opacity-30`}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {Array.from({ length: Math.min(pagination.last_page, 5) }, (_, i) => {
                let page: number;
                if (pagination.last_page <= 5) page = i + 1;
                else if (pagination.current_page <= 3) page = i + 1;
                else if (pagination.current_page >= pagination.last_page - 2) page = pagination.last_page - 4 + i;
                else page = pagination.current_page - 2 + i;
                return (
                  <button key={page} onClick={() => fetchLogs(page)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium ${pagination.current_page === page ? s.btnPrimary : s.btnSecondary}`}>
                    {page}
                  </button>
                );
              })}
              <button onClick={() => fetchLogs(pagination.current_page + 1)} disabled={pagination.current_page >= pagination.last_page}
                className={`p-1.5 rounded-lg ${s.btnSecondary} disabled:opacity-30`}>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
