import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Package, Truck, Clock, CheckCircle2, Wallet, Loader2,
  ChevronRight, ShoppingBag, MapPin, Store
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

interface Stats {
  total_orders: number;
  pending_orders: number;
  delivered_orders: number;
  total_spent: number;
}

interface OrderItem {
  id: number; product_name: string; product_image: string | null;
  price: number; quantity: number; total: number;
}

interface RecentOrder {
  id: number; order_number: string; status: string;
  total: number; created_at: string;
  store?: { id: number; name: string; slug: string; logo: string };
  items: OrderItem[];
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:    { label: "Pendente",       color: "text-amber-600",   icon: <Clock className="h-3 w-3" /> },
  confirmed:  { label: "Confirmado",     color: "text-blue-600",    icon: <CheckCircle2 className="h-3 w-3" /> },
  processing: { label: "Em Preparacao",  color: "text-violet-600",  icon: <Package className="h-3 w-3" /> },
  shipped:    { label: "Enviado",        color: "text-cyan-600",    icon: <Truck className="h-3 w-3" /> },
  delivered:  { label: "Entregue",       color: "text-emerald-600", icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled:  { label: "Cancelado",      color: "text-red-600",     icon: <Package className="h-3 w-3" /> },
};

export default function ClientDashboard() {
  const { user, token } = useAuth();
  const s = useAdminStyles();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<RecentOrder[]>([]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/client/dashboard`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    })
      .then((r) => r.json())
      .then((d) => { setStats(d.stats); setRecent(d.recent_orders || []); })
      .finally(() => setLoading(false));
  }, [token]);

  const formatPrice = (v: number) => new Intl.NumberFormat("pt-AO").format(v) + " Kz";
  const formatDate = (d: string) => new Date(d).toLocaleDateString("pt-AO", { day: "2-digit", month: "short", year: "numeric" });

  const cardCls = `rounded-2xl border ${s.card} p-5`;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className={`h-8 w-8 animate-spin ${s.textMuted}`} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Welcome */}
      <div>
        <h2 className={`text-lg font-bold ${s.textPrimary}`}>Ola, {user?.name?.split(" ")[0]}!</h2>
        <p className={`text-xs ${s.textMuted}`}>Resumo da sua conta e pedidos recentes</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Pedidos", value: stats?.total_orders ?? 0, icon: ShoppingBag, color: "text-blue-500", bg: s.isDark ? "bg-blue-500/10" : "bg-blue-50" },
          { label: "Pendentes", value: stats?.pending_orders ?? 0, icon: Clock, color: "text-amber-500", bg: s.isDark ? "bg-amber-500/10" : "bg-amber-50" },
          { label: "Entregues", value: stats?.delivered_orders ?? 0, icon: CheckCircle2, color: "text-emerald-500", bg: s.isDark ? "bg-emerald-500/10" : "bg-emerald-50" },
          { label: "Total Gasto", value: formatPrice(stats?.total_spent ?? 0), icon: Wallet, color: "text-purple-500", bg: s.isDark ? "bg-purple-500/10" : "bg-purple-50" },
        ].map((c, i) => (
          <div key={i} className={cardCls}>
            <div className={`h-10 w-10 rounded-xl ${c.bg} flex items-center justify-center mb-3`}>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </div>
            <p className={`text-[10px] ${s.textMuted} uppercase tracking-wider`}>{c.label}</p>
            <p className={`text-lg font-bold ${s.textPrimary} mt-0.5`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className={cardCls}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={`text-sm font-bold ${s.textPrimary}`}>Pedidos Recentes</h3>
            <p className={`text-[11px] ${s.textMuted}`}>Ultimos 5 pedidos</p>
          </div>
          <Link to="/minha-conta/pedidos" className={`flex items-center gap-1 text-xs font-medium text-orange-500 hover:text-orange-600 transition-colors`}>
            Ver Todos <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="text-center py-10">
            <ShoppingBag className={`h-10 w-10 ${s.textMuted} mx-auto mb-2 opacity-40`} />
            <p className={`text-xs ${s.textMuted}`}>Ainda nao fez nenhum pedido</p>
            <Link to="/" className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-xl text-xs font-semibold bg-orange-500 text-white hover:bg-orange-600 transition-colors">
              Ir as Compras
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recent.map((order) => {
              const st = STATUS_MAP[order.status] || STATUS_MAP.pending;
              return (
                <Link
                  key={order.id}
                  to={`/minha-conta/pedidos?order=${order.id}`}
                  className={`flex items-center gap-4 p-3 rounded-xl border ${s.isDark ? "border-white/[0.06] hover:bg-white/[0.03]" : "border-gray-100 hover:bg-gray-50"} transition-colors`}
                >
                  {/* Store logo */}
                  <div className={`h-10 w-10 rounded-xl ${s.isDark ? "bg-white/5" : "bg-gray-100"} flex items-center justify-center shrink-0 overflow-hidden`}>
                    {order.store?.logo ? (
                      <img src={order.store.logo} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Store className={`h-4 w-4 ${s.textMuted}`} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-xs font-semibold ${s.textPrimary}`}>#{order.order_number}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.color} ${s.isDark ? "bg-white/5" : "bg-gray-50"}`}>
                        {st.icon} {st.label}
                      </span>
                    </div>
                    <p className={`text-[11px] ${s.textMuted} mt-0.5`}>
                      {order.store?.name || "Loja"} • {order.items.length} {order.items.length === 1 ? "item" : "itens"} • {formatDate(order.created_at)}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className={`text-xs font-bold ${s.textPrimary}`}>{formatPrice(order.total)}</p>
                  </div>

                  <ChevronRight className={`h-4 w-4 ${s.textMuted} shrink-0`} />
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link to="/minha-conta/perfil" className={`${cardCls} flex items-center gap-3 group hover:shadow-md transition-shadow`}>
          <div className={`h-10 w-10 rounded-xl ${s.isDark ? "bg-purple-500/10" : "bg-purple-50"} flex items-center justify-center`}>
            <MapPin className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <p className={`text-xs font-semibold ${s.textPrimary} group-hover:text-purple-500 transition-colors`}>Editar Perfil</p>
            <p className={`text-[10px] ${s.textMuted}`}>Nome, telefone, foto</p>
          </div>
        </Link>
        <Link to="/minha-conta/enderecos" className={`${cardCls} flex items-center gap-3 group hover:shadow-md transition-shadow`}>
          <div className={`h-10 w-10 rounded-xl ${s.isDark ? "bg-emerald-500/10" : "bg-emerald-50"} flex items-center justify-center`}>
            <MapPin className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <p className={`text-xs font-semibold ${s.textPrimary} group-hover:text-emerald-500 transition-colors`}>Meus Enderecos</p>
            <p className={`text-[10px] ${s.textMuted}`}>Gerir enderecos de entrega</p>
          </div>
        </Link>
        <Link to="/minha-conta/seguranca" className={`${cardCls} flex items-center gap-3 group hover:shadow-md transition-shadow`}>
          <div className={`h-10 w-10 rounded-xl ${s.isDark ? "bg-red-500/10" : "bg-red-50"} flex items-center justify-center`}>
            <Package className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className={`text-xs font-semibold ${s.textPrimary} group-hover:text-red-500 transition-colors`}>Seguranca</p>
            <p className={`text-[10px] ${s.textMuted}`}>Alterar palavra-passe</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
