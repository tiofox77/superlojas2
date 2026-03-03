import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3, Eye, Users, Store, Globe, Monitor, Smartphone, Tablet,
  TrendingUp, TrendingDown, Clock, Activity, ArrowRight, Loader2,
  MousePointerClick, ArrowUpRight, Minus, RefreshCw, Zap, FileText,
  Chrome, ExternalLink, MapPin
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

interface Summary {
  total_views: number; unique_visitors: number; today_views: number; today_unique: number;
  logged_in_users: number; stores_accessed: number; bounce_rate: number; avg_pages: number;
  views_change: number; unique_change: number;
}
interface DailyPoint { date: string; views: number; visitors: number; }
interface HourlyPoint { hour: string; views: number; }
interface TopPage { path: string; views: number; visitors: number; }
interface TopStore { store_slug: string; store_name: string; store_logo: string | null; views: number; visitors: number; }
interface Referrer { referrer_domain: string; views: number; visitors: number; }
interface Source { source: string; views: number; pct: number; }
interface GeoItem { country?: string; province?: string; views: number; visitors?: number; }
interface TechItem { device?: string; browser?: string; os?: string; views: number; }
interface RealtimeData { active_visitors: number; active_pages: { path: string; active: number }[]; recent_views: any[]; }
interface OnlineUser { user_id: number; name: string; email: string; role: string; store_name: string | null; last_seen: string; last_page: string; }

export default function AdminAnalytics() {
  const { token } = useAuth();
  const s = useAdminStyles();
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [dailyChart, setDailyChart] = useState<DailyPoint[]>([]);
  const [hourlyChart, setHourlyChart] = useState<HourlyPoint[]>([]);
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [topStores, setTopStores] = useState<TopStore[]>([]);
  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [countries, setCountries] = useState<GeoItem[]>([]);
  const [devices, setDevices] = useState<TechItem[]>([]);
  const [browsers, setBrowsers] = useState<TechItem[]>([]);
  const [realtime, setRealtime] = useState<RealtimeData | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  const safeFetch = async (url: string, headers: Record<string, string>) => {
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  };

  const fetchAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const h = { Authorization: `Bearer ${token}`, Accept: "application/json" };
    const q = `?days=${days}`;

    const [dash, pages, stores, ref, geo, tech, rt, users] = await Promise.all([
      safeFetch(`${API}/admin/analytics/dashboard${q}`, h),
      safeFetch(`${API}/admin/analytics/top-pages${q}&limit=10`, h),
      safeFetch(`${API}/admin/analytics/top-stores${q}&limit=10`, h),
      safeFetch(`${API}/admin/analytics/referrers${q}`, h),
      safeFetch(`${API}/admin/analytics/geography${q}`, h),
      safeFetch(`${API}/admin/analytics/technology${q}`, h),
      safeFetch(`${API}/admin/analytics/realtime`, h),
      safeFetch(`${API}/admin/analytics/online-users`, h),
    ]);

    if (dash) {
      setSummary(dash.summary ?? null);
      setDailyChart(dash.daily_chart || []);
      setHourlyChart(dash.hourly_chart || []);
    }
    setTopPages(pages || []);
    setTopStores(stores || []);
    if (ref) {
      setReferrers(ref.top_referrers || []);
      setSources(ref.sources || []);
    }
    if (geo) setCountries(geo.countries || []);
    if (tech) {
      setDevices(tech.devices || []);
      setBrowsers(tech.browsers || []);
    }
    if (rt) setRealtime(rt);
    if (users) setOnlineUsers(users);

    setLoading(false);
  }, [token, days]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto-refresh realtime every 30s
  useEffect(() => {
    if (!token) return;
    const h = { Authorization: `Bearer ${token}`, Accept: "application/json" };
    const iv = setInterval(async () => {
      const [rt, users] = await Promise.all([
        safeFetch(`${API}/admin/analytics/realtime`, h),
        safeFetch(`${API}/admin/analytics/online-users`, h),
      ]);
      if (rt) setRealtime(rt);
      if (users) setOnlineUsers(users);
    }, 30000);
    return () => clearInterval(iv);
  }, [token]);

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
  const cardCls = `rounded-2xl border ${s.card} p-5`;
  const maxDaily = Math.max(...dailyChart.map(d => d.views), 1);
  const maxHourly = Math.max(...hourlyChart.map(d => d.views), 1);

  const ChangeIndicator = ({ val }: { val: number }) => (
    <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${val > 0 ? "text-emerald-500" : val < 0 ? "text-red-500" : s.textMuted}`}>
      {val > 0 ? <TrendingUp className="h-3 w-3" /> : val < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
      {val > 0 ? "+" : ""}{val}%
    </span>
  );

  const emptySummary: Summary = {
    total_views: 0, unique_visitors: 0, today_views: 0, today_unique: 0,
    logged_in_users: 0, stores_accessed: 0, bounce_rate: 0, avg_pages: 0,
    views_change: 0, unique_change: 0,
  };
  const sum = summary ?? emptySummary;

  if (loading) return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-bold ${s.textPrimary}`}>Analytics</h2>
          <p className={`text-xs ${s.textMuted}`}>A carregar dados...</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className={`rounded-2xl border ${s.card} p-5 animate-pulse`}>
            <div className={`h-4 w-24 ${s.skeleton} rounded mb-3`} />
            <div className={`h-7 w-16 ${s.skeleton} rounded`} />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-bold ${s.textPrimary}`}>Analytics</h2>
          <p className={`text-xs ${s.textMuted}`}>Analise de acessos e comportamento dos visitantes</p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 14, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${days === d ? s.btnPrimary : s.btnSecondary}`}>
              {d}d
            </button>
          ))}
          <button onClick={fetchAll} className={`p-2 rounded-lg ${s.btnSecondary}`} title="Actualizar">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <Link to="/admin/relatorios" className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${s.btnSecondary}`}>
            <FileText className="h-3.5 w-3.5" /> Relatorios
          </Link>
        </div>
      </div>

      {/* Realtime Banner */}
      {realtime && (
        <div className={`rounded-2xl border ${s.isDark ? "border-emerald-500/20 bg-emerald-500/5" : "border-emerald-200 bg-emerald-50"} p-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Activity className="h-5 w-5 text-emerald-500" />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
            </div>
            <div>
              <p className={`text-sm font-bold ${s.textPrimary}`}>
                <span className="text-emerald-500">{realtime.active_visitors}</span> visitantes activos agora
              </p>
              <p className={`text-[11px] ${s.textMuted}`}>Ultimos 30 minutos — actualiza automaticamente</p>
            </div>
          </div>
          {realtime.active_pages.length > 0 && (
            <div className="hidden sm:flex items-center gap-3">
              {realtime.active_pages.slice(0, 3).map((p, i) => (
                <span key={i} className={`text-[10px] ${s.textSecondary} truncate max-w-[120px]`}>
                  {p.path} <span className="text-emerald-500 font-bold">({p.active})</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Visualizacoes", val: fmt(sum.total_views), icon: Eye, color: "text-blue-500", bg: "bg-blue-500", change: sum.views_change },
            { label: "Visitantes Unicos", val: fmt(sum.unique_visitors), icon: Users, color: "text-violet-500", bg: "bg-violet-500", change: sum.unique_change },
            { label: "Hoje", val: `${fmt(sum.today_views)} / ${fmt(sum.today_unique)} un.`, icon: Zap, color: "text-amber-500", bg: "bg-amber-500" },
            { label: "Utilizadores Logados", val: fmt(sum.logged_in_users), icon: Users, color: "text-emerald-500", bg: "bg-emerald-500" },
            { label: "Lojas Visitadas", val: fmt(sum.stores_accessed), icon: Store, color: "text-orange-500", bg: "bg-orange-500" },
            { label: "Taxa Rejeicao", val: `${sum.bounce_rate}%`, icon: MousePointerClick, color: "text-red-500", bg: "bg-red-500" },
            { label: "Pags/Sessao", val: String(sum.avg_pages), icon: FileText, color: "text-cyan-500", bg: "bg-cyan-500" },
            { label: "Utilizadores Online", val: String(onlineUsers.length), icon: Activity, color: "text-emerald-500", bg: "bg-emerald-500" },
          ].map((c, i) => (
            <div key={i} className={cardCls}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[11px] font-medium ${s.textMuted}`}>{c.label}</span>
                <div className={`h-7 w-7 rounded-lg ${s.isDark ? `${c.bg}/10` : `${c.bg}/10`} flex items-center justify-center`}>
                  <c.icon className={`h-3.5 w-3.5 ${c.color}`} />
                </div>
              </div>
              <p className={`text-xl font-extrabold ${s.textPrimary}`}>{c.val}</p>
              {c.change !== undefined && <ChangeIndicator val={c.change} />}
            </div>
          ))}
        </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Daily Views Chart */}
        <div className={`${cardCls} lg:col-span-2`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-sm font-bold ${s.textPrimary}`}>Visualizacoes Diarias</h3>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Views</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-500" /> Unicos</span>
            </div>
          </div>
          <div className="flex items-end gap-[2px] h-40">
            {dailyChart.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-[1px] group relative" title={`${d.date}: ${d.views} views, ${d.visitors} unicos`}>
                <div className="w-full rounded-t-sm bg-blue-500/80 transition-all hover:bg-blue-500"
                  style={{ height: `${Math.max((d.views / maxDaily) * 100, 2)}%` }} />
                <div className="w-full rounded-t-sm bg-violet-500/60 transition-all hover:bg-violet-500"
                  style={{ height: `${Math.max((d.visitors / maxDaily) * 100, 1)}%` }} />
                {/* Tooltip on hover */}
                <div className={`absolute bottom-full mb-1 hidden group-hover:block z-10 ${s.isDark ? "bg-gray-800" : "bg-white shadow-lg"} border ${s.border} rounded-lg px-2 py-1 text-[9px] whitespace-nowrap`}>
                  <p className={`font-bold ${s.textPrimary}`}>{d.date}</p>
                  <p className="text-blue-500">{d.views} views</p>
                  <p className="text-violet-500">{d.visitors} unicos</p>
                </div>
              </div>
            ))}
          </div>
          {dailyChart.length > 0 && (
            <div className="flex justify-between mt-1">
              <span className={`text-[9px] ${s.textMuted}`}>{dailyChart[0]?.date}</span>
              <span className={`text-[9px] ${s.textMuted}`}>{dailyChart[dailyChart.length - 1]?.date}</span>
            </div>
          )}
        </div>

        {/* Hourly Today */}
        <div className={cardCls}>
          <h3 className={`text-sm font-bold ${s.textPrimary} mb-4`}>Acessos Hoje (por hora)</h3>
          <div className="flex items-end gap-[2px] h-40">
            {hourlyChart.map((h, i) => (
              <div key={i} className="flex-1 group relative" title={`${h.hour}: ${h.views}`}>
                <div className="w-full rounded-t-sm bg-amber-500/70 hover:bg-amber-500 transition-all"
                  style={{ height: `${Math.max((h.views / maxHourly) * 100, 2)}%` }} />
                <div className={`absolute bottom-full mb-1 hidden group-hover:block z-10 ${s.isDark ? "bg-gray-800" : "bg-white shadow-lg"} border ${s.border} rounded-lg px-2 py-1 text-[9px] whitespace-nowrap`}>
                  <p className="font-bold">{h.hour}</p>
                  <p className="text-amber-500">{h.views} views</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className={`text-[9px] ${s.textMuted}`}>00:00</span>
            <span className={`text-[9px] ${s.textMuted}`}>23:00</span>
          </div>
        </div>
      </div>

      {/* Middle Row: Top Stores + Top Pages + Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Stores */}
        <div className={cardCls}>
          <h3 className={`text-sm font-bold ${s.textPrimary} mb-3 flex items-center gap-2`}>
            <Store className="h-4 w-4 text-orange-500" /> Lojas Mais Visitadas
          </h3>
          <div className="space-y-2">
            {topStores.length === 0 && <p className={`text-xs ${s.textMuted}`}>Sem dados</p>}
            {topStores.slice(0, 8).map((st, i) => (
              <div key={i} className={`flex items-center gap-2 p-2 rounded-lg ${s.hoverRow} transition-colors`}>
                <span className={`text-[10px] font-bold ${s.textMuted} w-4`}>{i + 1}</span>
                <div className={`h-7 w-7 rounded-lg ${s.isDark ? "bg-white/[0.06]" : "bg-gray-100"} flex items-center justify-center overflow-hidden shrink-0`}>
                  {st.store_logo ? <img src={st.store_logo} className="h-full w-full object-cover" /> : <Store className={`h-3.5 w-3.5 ${s.textMuted}`} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${s.textPrimary} truncate`}>{st.store_name}</p>
                  <p className={`text-[10px] ${s.textMuted}`}>{st.visitors} visitantes</p>
                </div>
                <span className={`text-xs font-bold ${s.textPrimary}`}>{fmt(st.views)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Pages */}
        <div className={cardCls}>
          <h3 className={`text-sm font-bold ${s.textPrimary} mb-3 flex items-center gap-2`}>
            <FileText className="h-4 w-4 text-blue-500" /> Paginas Mais Visitadas
          </h3>
          <div className="space-y-2">
            {topPages.length === 0 && <p className={`text-xs ${s.textMuted}`}>Sem dados</p>}
            {topPages.slice(0, 8).map((p, i) => (
              <div key={i} className={`flex items-center gap-2 p-2 rounded-lg ${s.hoverRow} transition-colors`}>
                <span className={`text-[10px] font-bold ${s.textMuted} w-4`}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${s.textPrimary} truncate`}>{p.path}</p>
                  <p className={`text-[10px] ${s.textMuted}`}>{p.visitors} unicos</p>
                </div>
                <span className={`text-xs font-bold ${s.textPrimary}`}>{fmt(p.views)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Traffic Sources */}
        <div className={cardCls}>
          <h3 className={`text-sm font-bold ${s.textPrimary} mb-3 flex items-center gap-2`}>
            <ArrowUpRight className="h-4 w-4 text-emerald-500" /> Fontes de Trafego
          </h3>
          <div className="space-y-3 mb-4">
            {sources.map((src, i) => {
              const colors = ["bg-blue-500", "bg-emerald-500", "bg-pink-500", "bg-amber-500"];
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium ${s.textPrimary}`}>{src.source}</span>
                    <span className={`text-[10px] ${s.textMuted}`}>{src.pct}% ({fmt(src.views)})</span>
                  </div>
                  <div className={`h-2 rounded-full ${s.isDark ? "bg-white/[0.06]" : "bg-gray-100"} overflow-hidden`}>
                    <div className={`h-full rounded-full ${colors[i % 4]} transition-all`} style={{ width: `${src.pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className={`border-t ${s.borderLight} pt-3`}>
            <p className={`text-[11px] font-semibold ${s.textSecondary} mb-2`}>Top Referrers</p>
            {referrers.slice(0, 5).map((r, i) => (
              <div key={i} className="flex items-center justify-between py-1">
                <span className={`text-xs ${s.textPrimary} flex items-center gap-1`}>
                  <ExternalLink className="h-3 w-3 text-emerald-500" /> {r.referrer_domain}
                </span>
                <span className={`text-[10px] font-bold ${s.textSecondary}`}>{fmt(r.views)}</span>
              </div>
            ))}
            {referrers.length === 0 && <p className={`text-[11px] ${s.textMuted}`}>Sem referrers externos</p>}
          </div>
        </div>
      </div>

      {/* Bottom Row: Geography + Technology + Online Users */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Countries */}
        <div className={cardCls}>
          <h3 className={`text-sm font-bold ${s.textPrimary} mb-3 flex items-center gap-2`}>
            <Globe className="h-4 w-4 text-cyan-500" /> Paises
          </h3>
          <div className="space-y-2">
            {countries.length === 0 && <p className={`text-xs ${s.textMuted}`}>Sem dados</p>}
            {countries.slice(0, 10).map((c, i) => {
              const maxViews = countries[0]?.views || 1;
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${s.textPrimary} w-24 truncate`}>{c.country}</span>
                  <div className={`flex-1 h-2 rounded-full ${s.isDark ? "bg-white/[0.06]" : "bg-gray-100"} overflow-hidden`}>
                    <div className="h-full rounded-full bg-cyan-500 transition-all" style={{ width: `${(c.views / maxViews) * 100}%` }} />
                  </div>
                  <span className={`text-[10px] font-bold ${s.textSecondary} w-10 text-right`}>{fmt(c.views)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Devices + Browsers */}
        <div className={cardCls}>
          <h3 className={`text-sm font-bold ${s.textPrimary} mb-3 flex items-center gap-2`}>
            <Monitor className="h-4 w-4 text-violet-500" /> Dispositivos & Browsers
          </h3>
          <div className="space-y-3 mb-4">
            <p className={`text-[10px] font-semibold ${s.textMuted} uppercase tracking-wider`}>Dispositivos</p>
            <div className="flex gap-2">
              {devices.map((d, i) => {
                const total = devices.reduce((s, x) => s + x.views, 0) || 1;
                const pct = Math.round((d.views / total) * 100);
                const icons: Record<string, any> = { desktop: Monitor, mobile: Smartphone, tablet: Tablet };
                const Icon = icons[d.device || ""] || Monitor;
                return (
                  <div key={i} className={`flex-1 p-3 rounded-xl ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"} text-center`}>
                    <Icon className={`h-5 w-5 mx-auto mb-1 ${s.textSecondary}`} />
                    <p className={`text-lg font-extrabold ${s.textPrimary}`}>{pct}%</p>
                    <p className={`text-[10px] ${s.textMuted} capitalize`}>{d.device}</p>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <p className={`text-[10px] font-semibold ${s.textMuted} uppercase tracking-wider mb-2`}>Browsers</p>
            {browsers.slice(0, 5).map((b, i) => {
              const total = browsers.reduce((s, x) => s + x.views, 0) || 1;
              return (
                <div key={i} className="flex items-center justify-between py-1">
                  <span className={`text-xs ${s.textPrimary} flex items-center gap-1.5`}>
                    <Chrome className={`h-3 w-3 ${s.textMuted}`} /> {b.browser}
                  </span>
                  <span className={`text-[10px] font-bold ${s.textSecondary}`}>{Math.round((b.views / total) * 100)}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Online Users */}
        <div className={cardCls}>
          <h3 className={`text-sm font-bold ${s.textPrimary} mb-3 flex items-center gap-2`}>
            <Activity className="h-4 w-4 text-emerald-500" /> Utilizadores Online
            <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${s.isDark ? "bg-emerald-500/15 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>
              {onlineUsers.length}
            </span>
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {onlineUsers.length === 0 && <p className={`text-xs ${s.textMuted}`}>Nenhum utilizador online agora</p>}
            {onlineUsers.map((u, i) => (
              <div key={i} className={`flex items-center gap-2 p-2 rounded-lg ${s.hoverRow}`}>
                <div className="relative">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white text-[10px] font-bold">
                    {u.name.charAt(0)}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-emerald-500 rounded-full border-2 border-card" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${s.textPrimary} truncate`}>{u.name}</p>
                  <p className={`text-[10px] ${s.textMuted} truncate`}>
                    {u.role === "store_owner" && u.store_name ? `🏪 ${u.store_name}` : u.role === "super_admin" ? "👑 Admin" : "👤 Cliente"} — {u.last_page}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
