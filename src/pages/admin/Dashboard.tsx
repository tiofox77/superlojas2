import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users, Store, Package, Tag, Image, Clock,
  CheckCircle2, XCircle
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

interface Stats {
  total_users: number;
  total_stores: number;
  total_products: number;
  total_categories: number;
  pending_stores: number;
  approved_stores: number;
  rejected_stores: number;
  total_hero_slides: number;
  store_owners: number;
  customers: number;
}

interface RecentItem {
  id: number;
  name: string;
  email?: string;
  role?: string;
  status?: string;
  created_at: string;
  store?: { name: string };
}

export default function AdminDashboard() {
  const { token } = useAuth();
  const s = useAdminStyles();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentStores, setRecentStores] = useState<RecentItem[]>([]);
  const [recentProducts, setRecentProducts] = useState<RecentItem[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    })
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats);
        setRecentStores(data.recent_stores || []);
        setRecentProducts(data.recent_products || []);
        setRecentUsers(data.recent_users || []);
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className={`rounded-2xl border ${s.card} p-5 animate-pulse`}>
            <div className={`h-4 w-20 ${s.skeleton} rounded mb-3`} />
            <div className={`h-8 w-14 ${s.skeleton} rounded`} />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { label: "Total Lojas", value: stats.total_stores, icon: Store, iconColor: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-500/10" },
    { label: "Produtos", value: stats.total_products, icon: Package, iconColor: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
    { label: "Utilizadores", value: stats.total_users, icon: Users, iconColor: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
    { label: "Categorias", value: stats.total_categories, icon: Tag, iconColor: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-500/10" },
    { label: "Pendentes", value: stats.pending_stores, icon: Clock, iconColor: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10" },
    { label: "Aprovadas", value: stats.approved_stores, icon: CheckCircle2, iconColor: "text-green-500", bg: "bg-green-50 dark:bg-green-500/10" },
    { label: "Rejeitadas", value: stats.rejected_stores, icon: XCircle, iconColor: "text-red-500", bg: "bg-red-50 dark:bg-red-500/10" },
    { label: "Hero Slides", value: stats.total_hero_slides, icon: Image, iconColor: "text-pink-500", bg: "bg-pink-50 dark:bg-pink-500/10" },
  ];

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={`rounded-2xl border ${s.card} ${s.cardHover} p-4 transition-all cursor-default`}
          >
            <div className={`h-10 w-10 rounded-xl ${s.isDark ? "" : card.bg} ${s.isDark ? card.bg.split(" ")[1] || "bg-white/5" : ""} flex items-center justify-center mb-3`}>
              <card.icon className={`h-5 w-5 ${card.iconColor}`} />
            </div>
            <p className={`text-2xl font-bold ${s.textPrimary}`}>{card.value}</p>
            <p className={`text-[11px] ${s.textMuted} mt-0.5`}>{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Stores */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className={`rounded-2xl border ${s.card} overflow-hidden`}>
          <div className={`flex items-center px-5 py-4 border-b ${s.borderLight}`}>
            <h3 className={`text-sm font-semibold ${s.textPrimary} flex items-center gap-2`}>
              <Store className="h-4 w-4 text-orange-500" /> Lojas Recentes
            </h3>
          </div>
          <div className={`divide-y ${s.borderLight}`}>
            {recentStores.map((store) => (
              <div key={store.id} className={`flex items-center gap-3 px-5 py-3 ${s.hoverRow} transition-colors`}>
                <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500 text-xs font-bold shrink-0">
                  {store.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${s.textPrimary} truncate`}>{store.name}</p>
                  <p className={`text-[10px] ${s.textMuted}`}>{timeAgo(store.created_at)} atras</p>
                </div>
                {store.status && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    store.status === "approved" ? s.badge("green") : store.status === "pending" ? s.badge("amber") : s.badge("red")
                  }`}>
                    {store.status === "approved" ? "Aprovada" : store.status === "pending" ? "Pendente" : "Rejeitada"}
                  </span>
                )}
              </div>
            ))}
            {recentStores.length === 0 && <p className={`text-xs ${s.textMuted} text-center py-6`}>Sem lojas</p>}
          </div>
        </motion.div>

        {/* Recent Products */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className={`rounded-2xl border ${s.card} overflow-hidden`}>
          <div className={`flex items-center px-5 py-4 border-b ${s.borderLight}`}>
            <h3 className={`text-sm font-semibold ${s.textPrimary} flex items-center gap-2`}>
              <Package className="h-4 w-4 text-emerald-500" /> Produtos Recentes
            </h3>
          </div>
          <div className={`divide-y ${s.borderLight}`}>
            {recentProducts.map((product) => (
              <div key={product.id} className={`flex items-center gap-3 px-5 py-3 ${s.hoverRow} transition-colors`}>
                <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500 text-xs font-bold shrink-0">
                  {product.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${s.textPrimary} truncate`}>{product.name}</p>
                  <p className={`text-[10px] ${s.textMuted}`}>{product.store?.name || "—"}</p>
                </div>
                <span className={`text-[10px] ${s.textMuted}`}>{timeAgo(product.created_at)}</span>
              </div>
            ))}
            {recentProducts.length === 0 && <p className={`text-xs ${s.textMuted} text-center py-6`}>Sem produtos</p>}
          </div>
        </motion.div>
      </div>

      {/* Recent Users */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
        className={`rounded-2xl border ${s.card} overflow-hidden`}>
        <div className={`flex items-center px-5 py-4 border-b ${s.borderLight}`}>
          <h3 className={`text-sm font-semibold ${s.textPrimary} flex items-center gap-2`}>
            <Users className="h-4 w-4 text-violet-500" /> Utilizadores Recentes
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${s.borderLight}`}>
                {["Nome", "Email", "Role", "Registado"].map((h) => (
                  <th key={h} className={`text-left text-[10px] font-semibold ${s.thText} uppercase tracking-wider px-5 py-2.5`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${s.borderLight}`}>
              {recentUsers.map((u) => (
                <tr key={u.id} className={`${s.hoverRow} transition-colors`}>
                  <td className={`px-5 py-3 text-xs ${s.textPrimary} font-medium`}>{u.name}</td>
                  <td className={`px-5 py-3 text-xs ${s.textSecondary}`}>{u.email}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      u.role === "super_admin" ? s.badge("orange") : u.role === "store_owner" ? s.badge("blue") : s.badge("gray")
                    }`}>
                      {u.role === "super_admin" ? "Admin" : u.role === "store_owner" ? "Lojista" : "Cliente"}
                    </span>
                  </td>
                  <td className={`px-5 py-3 text-[11px] ${s.textMuted}`}>{timeAgo(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
