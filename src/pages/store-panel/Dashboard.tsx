import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { Package, Image, Star, MessageSquare, TrendingUp, CheckCircle2, Clock, XCircle, Globe, ExternalLink, Copy } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

interface DashboardData {
  store: any;
  stats: { total_products: number; total_slides: number; rating: string; review_count: number; status: string };
  recent_products: any[];
}

export default function StorePanelDashboard() {
  const { token } = useAuth();
  const s = useAdminStyles();
  const { slug } = useOutletContext<{ slug: string }>();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !slug) return;
    fetch(`${API}/store-panel/${slug}/dashboard`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } })
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [token, slug]);

  if (loading) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => <div key={i} className={`rounded-2xl border ${s.card} h-28 animate-pulse`} />)}
    </div>
  );

  if (!data) return <p className={`text-sm ${s.textMuted}`}>Erro ao carregar dados.</p>;

  const BASE_DOMAIN = import.meta.env.VITE_BASE_DOMAIN || "superloja.vip";
  const hasSubdomain = data.store?.plan?.custom_domain;
  const subdomainUrl = `https://${data.store.slug}.${BASE_DOMAIN}`;
  const storeUrl = `https://${BASE_DOMAIN}/loja/${data.store.slug}`;
  const copyUrl = (url: string) => { navigator.clipboard.writeText(url); };

  const stats = [
    { label: "Produtos", value: data.stats.total_products, icon: Package, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Hero Slides", value: data.stats.total_slides, icon: Image, color: "text-cyan-500", bg: "bg-cyan-50" },
    { label: "Rating", value: parseFloat(data.stats.rating || "0").toFixed(1), icon: Star, color: "text-amber-500", bg: "bg-amber-50" },
    { label: "Avaliacoes", value: data.stats.review_count, icon: MessageSquare, color: "text-violet-500", bg: "bg-violet-50" },
  ];

  const statusBadge = data.stats.status === "approved"
    ? { text: "Aprovada", icon: CheckCircle2, cls: s.badge("green") }
    : data.stats.status === "pending"
    ? { text: "Pendente", icon: Clock, cls: s.badge("amber") }
    : { text: "Rejeitada", icon: XCircle, cls: s.badge("red") };

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className={`rounded-2xl border ${s.card} p-4 flex items-center justify-between`}>
        <div>
          <h2 className={`text-lg font-bold ${s.textPrimary}`}>Bem-vindo ao painel da sua loja</h2>
          <p className={`text-xs ${s.textMuted}`}>{data.store.name} — {data.store.province}, {data.store.city}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusBadge.cls}`}>
          <statusBadge.icon className="h-3.5 w-3.5" /> {statusBadge.text}
        </span>
      </div>

      {/* Links da Loja */}
      <div className={`rounded-2xl border ${s.card} p-4`}>
        <div className="flex items-center gap-2 mb-3">
          <div className={`h-8 w-8 rounded-lg ${s.isDark ? "bg-purple-500/10" : "bg-purple-50"} flex items-center justify-center`}>
            <Globe className="h-4 w-4 text-purple-500" />
          </div>
          <div>
            <h3 className={`text-sm font-bold ${s.textPrimary}`}>Links da sua Loja</h3>
            <p className={`text-[10px] ${s.textMuted}`}>Partilhe com os seus clientes</p>
          </div>
        </div>

        <div className="space-y-2">
          {/* Link principal */}
          <div className={`flex items-center gap-2 p-2.5 rounded-xl ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}>
            <div className="flex-1 min-w-0">
              <p className={`text-[10px] ${s.textMuted} mb-0.5`}>Link da Loja</p>
              <p className={`text-xs font-medium ${s.textPrimary} truncate`}>{storeUrl}</p>
            </div>
            <button onClick={() => copyUrl(storeUrl)} className={`p-1.5 rounded-lg ${s.isDark ? "hover:bg-white/5" : "hover:bg-gray-200"} transition-colors`} title="Copiar">
              <Copy className={`h-3.5 w-3.5 ${s.textMuted}`} />
            </button>
            <a href={storeUrl} target="_blank" rel="noopener noreferrer" className={`p-1.5 rounded-lg ${s.isDark ? "hover:bg-white/5" : "hover:bg-gray-200"} transition-colors`} title="Abrir">
              <ExternalLink className={`h-3.5 w-3.5 ${s.textMuted}`} />
            </a>
          </div>

          {/* Subdomínio */}
          {hasSubdomain ? (
            <div className={`flex items-center gap-2 p-2.5 rounded-xl border ${s.isDark ? "border-purple-500/20 bg-purple-500/5" : "border-purple-100 bg-purple-50/50"}`}>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-purple-500 font-semibold mb-0.5 flex items-center gap-1">
                  <Globe className="h-2.5 w-2.5" /> Subdominio Exclusivo
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${s.isDark ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-600"}`}>
                    {data.store.plan?.name}
                  </span>
                </p>
                <p className={`text-xs font-bold ${s.textPrimary} truncate`}>{subdomainUrl}</p>
              </div>
              <button onClick={() => copyUrl(subdomainUrl)} className={`p-1.5 rounded-lg ${s.isDark ? "hover:bg-purple-500/10" : "hover:bg-purple-100"} transition-colors`} title="Copiar">
                <Copy className="h-3.5 w-3.5 text-purple-500" />
              </button>
              <a href={subdomainUrl} target="_blank" rel="noopener noreferrer" className={`p-1.5 rounded-lg ${s.isDark ? "hover:bg-purple-500/10" : "hover:bg-purple-100"} transition-colors`} title="Abrir">
                <ExternalLink className="h-3.5 w-3.5 text-purple-500" />
              </a>
            </div>
          ) : (
            <div className={`flex items-center gap-3 p-2.5 rounded-xl ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"} opacity-60`}>
              <Globe className={`h-4 w-4 ${s.textMuted}`} />
              <div>
                <p className={`text-xs ${s.textMuted}`}>Subdominio nao disponivel no seu plano</p>
                <p className={`text-[10px] ${s.textMuted}`}>Faca upgrade para ter o seu proprio subdominio</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((st, i) => (
          <motion.div key={st.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`rounded-2xl border ${s.card} p-5`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`h-10 w-10 rounded-xl ${s.isDark ? "bg-white/5" : st.bg} flex items-center justify-center`}>
                <st.icon className={`h-5 w-5 ${st.color}`} />
              </div>
              <TrendingUp className={`h-4 w-4 ${s.textMuted}`} />
            </div>
            <p className={`text-2xl font-bold ${s.textPrimary}`}>{st.value}</p>
            <p className={`text-xs ${s.textMuted} mt-0.5`}>{st.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Recent products */}
      {data.recent_products.length > 0 && (
        <div className={`rounded-2xl border ${s.card} overflow-hidden`}>
          <div className={`px-5 py-3 border-b ${s.borderLight}`}>
            <h3 className={`text-sm font-semibold ${s.textPrimary}`}>Produtos Recentes</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {data.recent_products.map((p: any) => (
              <div key={p.id} className={`flex items-center gap-3 px-5 py-3 ${s.hoverRow} transition-colors`}>
                {p.images?.[0]
                  ? <img src={p.images[0]} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  : <div className={`h-10 w-10 rounded-lg ${s.isDark ? "bg-white/5" : "bg-gray-100"} flex items-center justify-center`}><Package className={`h-4 w-4 ${s.textMuted}`} /></div>
                }
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold ${s.textPrimary} truncate`}>{p.name}</p>
                  <p className={`text-[10px] ${s.textMuted}`}>{p.category} — {new Intl.NumberFormat("pt-AO").format(p.price)} Kz</p>
                </div>
                <span className={`text-xs font-medium ${p.stock > 0 ? "text-green-500" : "text-red-500"}`}>
                  {p.stock > 0 ? `${p.stock} em stock` : "Esgotado"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
