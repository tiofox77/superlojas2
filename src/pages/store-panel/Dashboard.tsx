import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import { useEffect, useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Package, Image, Star, MessageSquare, CheckCircle2, Clock, XCircle,
  Globe, ExternalLink, Copy, ShoppingCart, DollarSign, AlertTriangle, ArrowRight,
  BarChart3
} from "lucide-react";
import { productImgSrc } from "@/lib/imageHelpers";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";
const fmt = (v: number) => new Intl.NumberFormat("pt-AO").format(v);

interface DashboardData {
  store: any;
  plan?: { id: number; name: string; custom_domain: boolean; has_api: boolean; has_pos: boolean; analytics: boolean } | null;
  has_subdomain?: boolean;
  plan_name?: string | null;
  stats: {
    total_products: number; total_slides: number; rating: string; review_count: number; status: string;
    total_orders?: number; pending_orders?: number; revenue?: number; out_of_stock?: number; low_stock?: number;
  };
  recent_products: any[];
  low_stock_products?: any[];
  recent_orders?: any[];
}

const orderStatusMap: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendente", cls: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Confirmado", cls: "bg-blue-100 text-blue-700" },
  processing: { label: "Preparando", cls: "bg-cyan-100 text-cyan-700" },
  shipped: { label: "Enviado", cls: "bg-indigo-100 text-indigo-700" },
  delivered: { label: "Entregue", cls: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelado", cls: "bg-red-100 text-red-700" },
};

export default function StorePanelDashboard() {
  const { token } = useAuth();
  const s = useAdminStyles();
  const { slug } = useOutletContext<{ slug: string }>();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !slug) return;
    fetch(`${API}/store-panel/${slug}/dashboard`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } })
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [token, slug]);

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) return (
    <div className="space-y-4">
      <div className={`rounded-2xl border ${s.card} h-20 animate-pulse`} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className={`rounded-2xl border ${s.card} h-28 animate-pulse`} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => <div key={i} className={`rounded-2xl border ${s.card} h-48 animate-pulse`} />)}
      </div>
    </div>
  );

  if (!data) return <p className={`text-sm ${s.textMuted}`}>Erro ao carregar dados.</p>;

  const BASE_DOMAIN = import.meta.env.VITE_BASE_DOMAIN || "superloja.vip";
  const hasSubdomain = !!(data.has_subdomain || data.plan?.custom_domain || data.store?.plan?.custom_domain);
  const planName = data.plan_name || data.plan?.name || data.store?.plan?.name;
  const subdomainUrl = `https://${data.store.slug}.${BASE_DOMAIN}`;
  const storeUrl = `https://${BASE_DOMAIN}/lojas/${data.store.slug}`;

  const statusBadge = data.stats.status === "approved"
    ? { text: "Aprovada", icon: CheckCircle2, cls: s.badge("green") }
    : data.stats.status === "pending"
    ? { text: "Pendente", icon: Clock, cls: s.badge("amber") }
    : { text: "Rejeitada", icon: XCircle, cls: s.badge("red") };

  const stats = [
    { label: "Produtos", value: data.stats.total_products, icon: Package, color: "text-emerald-500", bg: "bg-emerald-50", darkBg: "bg-emerald-500/10" },
    { label: "Encomendas", value: data.stats.total_orders || 0, icon: ShoppingCart, color: "text-blue-500", bg: "bg-blue-50", darkBg: "bg-blue-500/10" },
    { label: "Receita", value: `${fmt(data.stats.revenue || 0)} Kz`, icon: DollarSign, color: "text-green-500", bg: "bg-green-50", darkBg: "bg-green-500/10", small: true },
    { label: "Rating", value: parseFloat(data.stats.rating || "0").toFixed(1), icon: Star, color: "text-amber-500", bg: "bg-amber-50", darkBg: "bg-amber-500/10" },
  ];

  const alerts: { text: string; color: string; count: number }[] = [];
  if (data.stats.pending_orders && data.stats.pending_orders > 0) alerts.push({ text: `${data.stats.pending_orders} encomenda(s) pendente(s)`, color: "text-amber-600", count: data.stats.pending_orders });
  if (data.stats.out_of_stock && data.stats.out_of_stock > 0) alerts.push({ text: `${data.stats.out_of_stock} produto(s) sem stock`, color: "text-red-500", count: data.stats.out_of_stock });
  if (data.stats.low_stock && data.stats.low_stock > 0) alerts.push({ text: `${data.stats.low_stock} produto(s) com stock baixo`, color: "text-orange-500", count: data.stats.low_stock });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className={`rounded-2xl border ${s.card} p-4 sm:p-5`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className={`text-lg font-bold ${s.textPrimary}`}>{data.store.name}</h2>
            <p className={`text-xs ${s.textMuted}`}>{data.store.province}, {data.store.city}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusBadge.cls}`}>
              <statusBadge.icon className="h-3.5 w-3.5" /> {statusBadge.text}
            </span>
            {planName && (
              <span className={`px-2.5 py-1.5 rounded-full text-[10px] font-bold ${s.isDark ? "bg-purple-500/15 text-purple-400" : "bg-purple-50 text-purple-600"}`}>
                {planName}
              </span>
            )}
          </div>
        </div>

        {/* Quick links */}
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"} flex-1 min-w-0`}>
            <Globe className={`h-3 w-3 ${s.textMuted} flex-shrink-0`} />
            <span className={`${s.textMuted} truncate text-[11px]`}>{storeUrl}</span>
            <button onClick={() => copyUrl(storeUrl)} className={`p-1 rounded ${s.isDark ? "hover:bg-white/5" : "hover:bg-gray-200"} flex-shrink-0`}>
              {copied === storeUrl ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <Copy className={`h-3 w-3 ${s.textMuted}`} />}
            </button>
            <a href={storeUrl} target="_blank" rel="noopener noreferrer" className={`p-1 rounded ${s.isDark ? "hover:bg-white/5" : "hover:bg-gray-200"} flex-shrink-0`}>
              <ExternalLink className={`h-3 w-3 ${s.textMuted}`} />
            </a>
          </div>
          {hasSubdomain && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border ${s.isDark ? "border-purple-500/20 bg-purple-500/5" : "border-purple-100 bg-purple-50/50"} flex-1 min-w-0`}>
              <Globe className="h-3 w-3 text-purple-500 flex-shrink-0" />
              <span className="text-purple-600 dark:text-purple-400 truncate text-[11px] font-medium">{subdomainUrl}</span>
              <button onClick={() => copyUrl(subdomainUrl)} className={`p-1 rounded ${s.isDark ? "hover:bg-purple-500/10" : "hover:bg-purple-100"} flex-shrink-0`}>
                {copied === subdomainUrl ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-purple-500" />}
              </button>
              <a href={subdomainUrl} target="_blank" rel="noopener noreferrer" className={`p-1 rounded ${s.isDark ? "hover:bg-purple-500/10" : "hover:bg-purple-100"} flex-shrink-0`}>
                <ExternalLink className="h-3 w-3 text-purple-500" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className={`rounded-2xl border ${s.isDark ? "border-amber-500/20 bg-amber-500/5" : "border-amber-200 bg-amber-50"} p-3.5 flex items-start gap-3`}>
          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {alerts.map((a, i) => (
              <span key={i} className={`text-xs font-medium ${a.color}`}>{a.text}</span>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((st, i) => (
          <motion.div key={st.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className={`rounded-2xl border ${s.card} p-4`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`h-9 w-9 rounded-xl ${s.isDark ? st.darkBg : st.bg} flex items-center justify-center`}>
                <st.icon className={`h-4.5 w-4.5 ${st.color}`} />
              </div>
            </div>
            <p className={`${(st as any).small ? "text-lg" : "text-2xl"} font-bold ${s.textPrimary} leading-tight`}>{st.value}</p>
            <p className={`text-[11px] ${s.textMuted} mt-0.5`}>{st.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Two-column grid: Recent Products + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent products */}
        <div className={`rounded-2xl border ${s.card} overflow-hidden`}>
          <div className={`px-4 py-3 border-b ${s.borderLight} flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <Package className={`h-4 w-4 ${s.textMuted}`} />
              <h3 className={`text-sm font-semibold ${s.textPrimary}`}>Produtos Recentes</h3>
            </div>
            <Link to={`/loja/${slug}/painel/produtos`} className="text-[11px] text-emerald-500 hover:text-emerald-600 font-medium flex items-center gap-0.5">
              Ver todos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {data.recent_products.length > 0 ? (
            <div className={`divide-y ${s.isDark ? "divide-white/5" : "divide-gray-100"}`}>
              {data.recent_products.map((p: any) => (
                <div key={p.id} className={`flex items-center gap-3 px-4 py-2.5 ${s.hoverRow} transition-colors`}>
                  {p.images?.[0]
                    ? <img src={productImgSrc(p.images[0])} alt="" className="h-9 w-9 rounded-lg object-cover flex-shrink-0" />
                    : <div className={`h-9 w-9 rounded-lg ${s.isDark ? "bg-white/5" : "bg-gray-100"} flex items-center justify-center flex-shrink-0`}><Package className={`h-3.5 w-3.5 ${s.textMuted}`} /></div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${s.textPrimary} truncate`}>{p.name}</p>
                    <p className={`text-[10px] ${s.textMuted}`}>{p.category} — {fmt(p.price)} Kz</p>
                  </div>
                  <span className={`text-[11px] font-semibold flex-shrink-0 ${p.stock > 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {p.stock > 0 ? `${p.stock}` : "0"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <Package className={`h-8 w-8 ${s.textMuted} mx-auto mb-2 opacity-40`} />
              <p className={`text-xs ${s.textMuted}`}>Sem produtos ainda</p>
            </div>
          )}
        </div>

        {/* Recent orders */}
        <div className={`rounded-2xl border ${s.card} overflow-hidden`}>
          <div className={`px-4 py-3 border-b ${s.borderLight} flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <ShoppingCart className={`h-4 w-4 ${s.textMuted}`} />
              <h3 className={`text-sm font-semibold ${s.textPrimary}`}>Encomendas Recentes</h3>
            </div>
            <Link to={`/loja/${slug}/painel/pedidos`} className="text-[11px] text-emerald-500 hover:text-emerald-600 font-medium flex items-center gap-0.5">
              Ver todos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {(data.recent_orders || []).length > 0 ? (
            <div className={`divide-y ${s.isDark ? "divide-white/5" : "divide-gray-100"}`}>
              {(data.recent_orders || []).map((o: any) => {
                const st = orderStatusMap[o.status] || { label: o.status, cls: "bg-gray-100 text-gray-600" };
                return (
                  <div key={o.id} className={`flex items-center gap-3 px-4 py-2.5 ${s.hoverRow} transition-colors`}>
                    <div className={`h-9 w-9 rounded-lg ${s.isDark ? "bg-white/5" : "bg-gray-50"} flex items-center justify-center flex-shrink-0`}>
                      <ShoppingCart className={`h-3.5 w-3.5 ${s.textMuted}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${s.textPrimary}`}>{o.order_number}</p>
                      <p className={`text-[10px] ${s.textMuted}`}>{o.customer_name} — {fmt(parseFloat(o.total))} Kz</p>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${st.cls}`}>{st.label}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center">
              <ShoppingCart className={`h-8 w-8 ${s.textMuted} mx-auto mb-2 opacity-40`} />
              <p className={`text-xs ${s.textMuted}`}>Sem encomendas ainda</p>
            </div>
          )}
        </div>
      </div>

      {/* Low stock alert */}
      {(data.low_stock_products || []).length > 0 && (
        <div className={`rounded-2xl border ${s.isDark ? "border-orange-500/20" : "border-orange-200"} overflow-hidden`}>
          <div className={`px-4 py-3 border-b ${s.isDark ? "border-orange-500/20 bg-orange-500/5" : "border-orange-200 bg-orange-50"} flex items-center gap-2`}>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <h3 className="text-sm font-semibold text-orange-600">Stock Baixo</h3>
          </div>
          <div className={`${s.isDark ? "bg-white/[0.01]" : "bg-white"} divide-y ${s.isDark ? "divide-white/5" : "divide-gray-100"}`}>
            {(data.low_stock_products || []).map((p: any) => (
              <div key={p.id} className={`flex items-center gap-3 px-4 py-2.5 ${s.hoverRow} transition-colors`}>
                {p.images?.[0]
                  ? <img src={productImgSrc(p.images[0])} alt="" className="h-9 w-9 rounded-lg object-cover flex-shrink-0" />
                  : <div className={`h-9 w-9 rounded-lg ${s.isDark ? "bg-white/5" : "bg-gray-100"} flex items-center justify-center flex-shrink-0`}><Package className={`h-3.5 w-3.5 ${s.textMuted}`} /></div>
                }
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold ${s.textPrimary} truncate`}>{p.name}</p>
                  <p className={`text-[10px] ${s.textMuted}`}>{fmt(p.price)} Kz</p>
                </div>
                <span className="text-[11px] font-bold text-orange-500">{p.stock} un.</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`rounded-2xl border ${s.card} p-3.5 text-center`}>
          <Image className={`h-4 w-4 mx-auto mb-1.5 text-cyan-500`} />
          <p className={`text-lg font-bold ${s.textPrimary}`}>{data.stats.total_slides}</p>
          <p className={`text-[10px] ${s.textMuted}`}>Hero Slides</p>
        </div>
        <div className={`rounded-2xl border ${s.card} p-3.5 text-center`}>
          <MessageSquare className={`h-4 w-4 mx-auto mb-1.5 text-violet-500`} />
          <p className={`text-lg font-bold ${s.textPrimary}`}>{data.stats.review_count}</p>
          <p className={`text-[10px] ${s.textMuted}`}>Avaliacoes</p>
        </div>
        <div className={`rounded-2xl border ${s.card} p-3.5 text-center`}>
          <Package className={`h-4 w-4 mx-auto mb-1.5 text-red-500`} />
          <p className={`text-lg font-bold ${s.textPrimary}`}>{data.stats.out_of_stock || 0}</p>
          <p className={`text-[10px] ${s.textMuted}`}>Sem Stock</p>
        </div>
        <div className={`rounded-2xl border ${s.card} p-3.5 text-center`}>
          <BarChart3 className={`h-4 w-4 mx-auto mb-1.5 text-emerald-500`} />
          <p className={`text-lg font-bold ${s.textPrimary}`}>{data.stats.pending_orders || 0}</p>
          <p className={`text-[10px] ${s.textMuted}`}>Pendentes</p>
        </div>
      </div>
    </div>
  );
}
