import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { Package, Image, Star, MessageSquare, TrendingUp, CheckCircle2, Clock, XCircle } from "lucide-react";

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
