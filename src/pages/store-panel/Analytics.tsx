import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import { useCallback, useEffect, useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import {
  Eye, Users, Zap, TrendingUp, TrendingDown, Minus,
  RefreshCw, Globe, Monitor, Smartphone, Tablet,
  MousePointerClick, FileText, BarChart3, Crown,
  ArrowUpRight, Lock
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

interface Summary {
  total_views: number; unique_visitors: number;
  today_views: number; today_unique: number;
  bounce_rate: number; avg_pages: number;
  views_change: number; unique_change: number;
}
interface DailyPoint { date: string; views: number; visitors: number; }
interface HourlyPoint { hour: number; views: number; }
interface TopPage { path: string; views: number; unique_views: number; }
interface Referrer { referrer_domain: string; visits: number; }
interface Source { source: string; count: number; }
interface GeoItem { country: string; visits: number; unique_visits: number; }
interface TechItem { name: string; count: number; }

const emptySummary: Summary = {
  total_views: 0, unique_visitors: 0, today_views: 0, today_unique: 0,
  bounce_rate: 0, avg_pages: 0, views_change: 0, unique_change: 0,
};

export default function StoreAnalytics() {
  const { token } = useAuth();
  const s = useAdminStyles();
  const { slug } = useOutletContext<{ slug: string }>();

  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [planName, setPlanName] = useState("");
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [dailyChart, setDailyChart] = useState<DailyPoint[]>([]);
  const [hourlyChart, setHourlyChart] = useState<HourlyPoint[]>([]);
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [countries, setCountries] = useState<GeoItem[]>([]);
  const [devices, setDevices] = useState<TechItem[]>([]);
  const [browsers, setBrowsers] = useState<TechItem[]>([]);

  const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };
  const base = `${API}/store-panel/${slug}/analytics`;

  const safeFetch = async (url: string) => {
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  };

  // Check plan access
  useEffect(() => {
    if (!token || !slug) return;
    safeFetch(`${base}/check`).then((d) => {
      if (d) {
        setHasAccess(d.has_analytics);
        setPlanName(d.plan);
      } else {
        setHasAccess(false);
      }
    });
  }, [token, slug]);

  const fetchAll = useCallback(async () => {
    if (!token || !slug || hasAccess !== true) return;
    setLoading(true);
    const q = `?days=${days}`;

    const [dash, pages, ref, geo, tech] = await Promise.all([
      safeFetch(`${base}/dashboard${q}`),
      safeFetch(`${base}/top-pages${q}&limit=10`),
      safeFetch(`${base}/referrers${q}`),
      safeFetch(`${base}/geography${q}`),
      safeFetch(`${base}/technology${q}`),
    ]);

    if (dash) {
      setSummary(dash.summary ?? null);
      setDailyChart(dash.daily_chart || []);
      setHourlyChart(dash.hourly_chart || []);
    }
    setTopPages(pages || []);
    if (ref) {
      setReferrers(ref.top_referrers || []);
      setSources(ref.sources || []);
    }
    if (geo) setCountries(geo.countries || []);
    if (tech) {
      setDevices(tech.devices || []);
      setBrowsers(tech.browsers || []);
    }
    setLoading(false);
  }, [token, slug, days, hasAccess]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const sum = summary ?? emptySummary;
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

  const DeviceIcon = ({ name }: { name: string }) => {
    if (name === "mobile") return <Smartphone className="h-3.5 w-3.5" />;
    if (name === "tablet") return <Tablet className="h-3.5 w-3.5" />;
    return <Monitor className="h-3.5 w-3.5" />;
  };

  // Plan gate: show upgrade prompt
  if (hasAccess === false) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className={`h-20 w-20 rounded-full ${s.isDark ? "bg-purple-500/10" : "bg-purple-50"} flex items-center justify-center mx-auto mb-5`}>
            <Lock className="h-10 w-10 text-purple-500" />
          </div>
          <h2 className={`text-xl font-bold ${s.textPrimary} mb-2`}>Analytics Indisponivel</h2>
          <p className={`text-sm ${s.textSecondary} mb-1 leading-relaxed`}>
            O seu plano actual <strong className="text-purple-500">({planName})</strong> nao inclui acesso ao Analytics.
          </p>
          <p className={`text-sm ${s.textSecondary} mb-6`}>
            Faca upgrade para um plano com analytics para ver estatisticas detalhadas da sua loja.
          </p>
          <Link
            to={`/loja/${slug}/painel/subscricao`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 transition-all shadow-lg shadow-purple-500/25"
          >
            <Crown className="h-4 w-4" /> Ver Planos & Upgrade
          </Link>
        </div>
      </div>
    );
  }

  // Loading check
  if (hasAccess === null) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <RefreshCw className={`h-6 w-6 animate-spin ${s.textMuted}`} />
      </div>
    );
  }

  // Loading data
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-lg font-bold ${s.textPrimary}`}>Analytics da Loja</h2>
            <p className={`text-xs ${s.textMuted}`}>A carregar dados...</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`rounded-2xl border ${s.card} p-5 animate-pulse`}>
              <div className={`h-4 w-24 ${s.skeleton} rounded mb-3`} />
              <div className={`h-7 w-16 ${s.skeleton} rounded`} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className={`text-lg font-bold ${s.textPrimary} flex items-center gap-2`}>
            <BarChart3 className="h-5 w-5 text-purple-500" /> Analytics da Loja
          </h2>
          <p className={`text-xs ${s.textMuted}`}>Estatisticas detalhadas de acessos e visitantes</p>
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
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: "Total Visualizacoes", val: fmt(sum.total_views), icon: Eye, color: "text-blue-500", bg: "bg-blue-500", change: sum.views_change },
          { label: "Visitantes Unicos", val: fmt(sum.unique_visitors), icon: Users, color: "text-violet-500", bg: "bg-violet-500", change: sum.unique_change },
          { label: "Hoje", val: `${fmt(sum.today_views)} / ${fmt(sum.today_unique)} un.`, icon: Zap, color: "text-amber-500", bg: "bg-amber-500" },
          { label: "Taxa Rejeicao", val: `${sum.bounce_rate}%`, icon: MousePointerClick, color: "text-red-500", bg: "bg-red-500" },
          { label: "Pags/Sessao", val: String(sum.avg_pages), icon: FileText, color: "text-cyan-500", bg: "bg-cyan-500" },
          { label: "Periodo", val: `${days} dias`, icon: RefreshCw, color: "text-gray-500", bg: "bg-gray-500" },
        ].map((c, i) => (
          <div key={i} className={cardCls}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[11px] font-medium ${s.textMuted}`}>{c.label}</span>
              <div className={`h-7 w-7 rounded-lg ${c.bg}/10 flex items-center justify-center`}>
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
        {/* Daily Chart */}
        <div className={`${cardCls} lg:col-span-2`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-sm font-bold ${s.textPrimary}`}>Visualizacoes Diarias</h3>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Views</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-500" /> Unicos</span>
            </div>
          </div>
          {dailyChart.length === 0 ? (
            <div className={`flex items-center justify-center h-40 ${s.textMuted} text-xs`}>Sem dados neste periodo</div>
          ) : (
            <div className="flex items-end gap-[3px] h-40">
              {dailyChart.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-[2px] group relative" title={`${d.date}: ${d.views} views, ${d.visitors} unicos`}>
                  <div className="w-full rounded-t bg-blue-500/80" style={{ height: `${(d.views / maxDaily) * 100}%`, minHeight: d.views > 0 ? 4 : 0 }} />
                  <div className="w-full rounded-t bg-violet-500/60" style={{ height: `${(d.visitors / maxDaily) * 100}%`, minHeight: d.visitors > 0 ? 2 : 0 }} />
                  {i % Math.max(1, Math.floor(dailyChart.length / 7)) === 0 && (
                    <span className={`text-[8px] ${s.textMuted} mt-1 whitespace-nowrap`}>
                      {new Date(d.date).toLocaleDateString("pt", { day: "2-digit", month: "short" })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hourly Chart */}
        <div className={cardCls}>
          <h3 className={`text-sm font-bold ${s.textPrimary} mb-4`}>Hoje por Hora</h3>
          {hourlyChart.length === 0 ? (
            <div className={`flex items-center justify-center h-40 ${s.textMuted} text-xs`}>Sem dados hoje</div>
          ) : (
            <div className="flex items-end gap-[2px] h-40">
              {Array.from({ length: 24 }, (_, h) => {
                const point = hourlyChart.find(p => p.hour === h);
                const v = point?.views || 0;
                return (
                  <div key={h} className="flex-1 flex flex-col items-center group" title={`${h}h: ${v} views`}>
                    <div className="w-full rounded-t bg-amber-500/70" style={{ height: `${(v / maxHourly) * 100}%`, minHeight: v > 0 ? 3 : 0 }} />
                    {h % 6 === 0 && <span className={`text-[8px] ${s.textMuted} mt-1`}>{h}h</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Details Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Pages */}
        <div className={cardCls}>
          <h3 className={`text-sm font-bold ${s.textPrimary} mb-3`}>Paginas Mais Visitadas</h3>
          {topPages.length === 0 ? (
            <p className={`text-xs ${s.textMuted}`}>Sem dados</p>
          ) : (
            <div className="space-y-2">
              {topPages.map((p, i) => {
                const pct = topPages[0]?.views ? (p.views / topPages[0].views) * 100 : 0;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs ${s.textSecondary} truncate max-w-[200px]`}>{p.path}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] ${s.textMuted}`}>{p.unique_views} un.</span>
                        <span className="text-xs font-bold text-blue-500">{p.views}</span>
                      </div>
                    </div>
                    <div className={`h-1.5 rounded-full ${s.isDark ? "bg-white/5" : "bg-gray-100"}`}>
                      <div className="h-full rounded-full bg-blue-500/60" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Referrers */}
        <div className={cardCls}>
          <h3 className={`text-sm font-bold ${s.textPrimary} mb-3`}>Fontes de Trafego</h3>
          {/* Sources breakdown */}
          {sources.length > 0 && (
            <div className="flex gap-3 mb-4">
              {sources.map((src, i) => {
                const total = sources.reduce((a, b) => a + b.count, 0);
                const pct = total > 0 ? Math.round((src.count / total) * 100) : 0;
                return (
                  <div key={i} className={`flex-1 p-3 rounded-xl ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}>
                    <p className={`text-[10px] font-medium ${s.textMuted} mb-1`}>{src.source}</p>
                    <p className={`text-lg font-bold ${s.textPrimary}`}>{pct}%</p>
                    <p className={`text-[10px] ${s.textMuted}`}>{src.count} visitas</p>
                  </div>
                );
              })}
            </div>
          )}
          {referrers.length === 0 ? (
            <p className={`text-xs ${s.textMuted}`}>Sem dados de referencia</p>
          ) : (
            <div className="space-y-2">
              {referrers.map((r, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className={`text-xs ${s.textSecondary} flex items-center gap-1.5`}>
                    <ArrowUpRight className="h-3 w-3 text-emerald-500" /> {r.referrer_domain}
                  </span>
                  <span className="text-xs font-bold text-emerald-500">{r.visits}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Geography + Technology */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Countries */}
        <div className={cardCls}>
          <h3 className={`text-sm font-bold ${s.textPrimary} mb-3 flex items-center gap-2`}>
            <Globe className="h-4 w-4 text-blue-500" /> Paises
          </h3>
          {countries.length === 0 ? (
            <p className={`text-xs ${s.textMuted}`}>Sem dados</p>
          ) : (
            <div className="space-y-2">
              {countries.map((c, i) => {
                const pct = countries[0]?.visits ? (c.visits / countries[0].visits) * 100 : 0;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs ${s.textSecondary}`}>{c.country}</span>
                      <span className="text-xs font-bold text-blue-500">{c.visits}</span>
                    </div>
                    <div className={`h-1 rounded-full ${s.isDark ? "bg-white/5" : "bg-gray-100"}`}>
                      <div className="h-full rounded-full bg-blue-500/50" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Devices */}
        <div className={cardCls}>
          <h3 className={`text-sm font-bold ${s.textPrimary} mb-3`}>Dispositivos</h3>
          {devices.length === 0 ? (
            <p className={`text-xs ${s.textMuted}`}>Sem dados</p>
          ) : (
            <div className="space-y-3">
              {devices.map((d, i) => {
                const total = devices.reduce((a, b) => a + b.count, 0);
                const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
                const colors = { desktop: "bg-blue-500", mobile: "bg-emerald-500", tablet: "bg-amber-500" };
                const color = colors[d.name as keyof typeof colors] || "bg-gray-500";
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-lg ${color}/10 flex items-center justify-center`}>
                      <DeviceIcon name={d.name} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-medium ${s.textPrimary} capitalize`}>{d.name}</span>
                        <span className={`text-xs font-bold ${s.textPrimary}`}>{pct}%</span>
                      </div>
                      <div className={`h-1.5 rounded-full ${s.isDark ? "bg-white/5" : "bg-gray-100"}`}>
                        <div className={`h-full rounded-full ${color}/70`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Browsers */}
        <div className={cardCls}>
          <h3 className={`text-sm font-bold ${s.textPrimary} mb-3`}>Navegadores</h3>
          {browsers.length === 0 ? (
            <p className={`text-xs ${s.textMuted}`}>Sem dados</p>
          ) : (
            <div className="space-y-2">
              {browsers.map((b, i) => {
                const total = browsers.reduce((a, br) => a + br.count, 0);
                const pct = total > 0 ? Math.round((b.count / total) * 100) : 0;
                return (
                  <div key={i} className="flex items-center justify-between">
                    <span className={`text-xs ${s.textSecondary}`}>{b.name}</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-16 h-1.5 rounded-full ${s.isDark ? "bg-white/5" : "bg-gray-100"}`}>
                        <div className="h-full rounded-full bg-cyan-500/60" style={{ width: `${pct}%` }} />
                      </div>
                      <span className={`text-[10px] font-bold ${s.textPrimary} w-8 text-right`}>{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
