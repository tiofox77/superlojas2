import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Package, Truck, Clock, CheckCircle2, XCircle, Loader2,
  Search, ChevronLeft, ChevronRight, Eye, X, Store,
  ShoppingBag, MapPin, Phone, CreditCard, FileText
} from "lucide-react";
import Modal from "@/components/admin/Modal";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

interface OrderItem {
  id: number; product_name: string; product_image: string | null;
  price: number; quantity: number; total: number;
}

interface Order {
  id: number; order_number: string; status: string;
  customer_name: string; customer_email: string; customer_phone: string;
  customer_address: string; customer_province: string; customer_notes: string | null;
  payment_method: string; subtotal: number; delivery_fee: number; total: number;
  cancel_reason: string | null; admin_notes: string | null;
  confirmed_at: string | null; shipped_at: string | null; delivered_at: string | null;
  cancelled_at: string | null; created_at: string;
  store?: { id: number; name: string; slug: string; logo: string };
  items: OrderItem[];
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:    { label: "Pendente",       color: "text-amber-600",   bg: "bg-amber-50 dark:bg-amber-500/10",   icon: <Clock className="h-3 w-3" /> },
  confirmed:  { label: "Confirmado",     color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-500/10",     icon: <CheckCircle2 className="h-3 w-3" /> },
  processing: { label: "Em Preparacao",  color: "text-violet-600",  bg: "bg-violet-50 dark:bg-violet-500/10", icon: <Package className="h-3 w-3" /> },
  shipped:    { label: "Enviado",        color: "text-cyan-600",    bg: "bg-cyan-50 dark:bg-cyan-500/10",     icon: <Truck className="h-3 w-3" /> },
  delivered:  { label: "Entregue",       color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-500/10", icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled:  { label: "Cancelado",      color: "text-red-600",     bg: "bg-red-50 dark:bg-red-500/10",       icon: <XCircle className="h-3 w-3" /> },
};

const FILTERS = [
  { key: "all", label: "Todos" },
  { key: "pending", label: "Pendentes" },
  { key: "confirmed", label: "Confirmados" },
  { key: "shipped", label: "Enviados" },
  { key: "delivered", label: "Entregues" },
  { key: "cancelled", label: "Cancelados" },
];

export default function ClientOrders() {
  const { token } = useAuth();
  const s = useAdminStyles();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQ, setSearchQ] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);

  const hdrs = { Authorization: `Bearer ${token}`, Accept: "application/json" };
  const formatPrice = (v: number) => new Intl.NumberFormat("pt-AO").format(v) + " Kz";
  const formatDate = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString("pt", { day: "2-digit", month: "2-digit", year: "2-digit" }) + " " +
           dt.toLocaleTimeString("pt", { hour: "2-digit", minute: "2-digit" });
  };

  const fetchOrders = async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), per_page: "10" });
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (searchQ) params.set("search", searchQ);
      const res = await fetch(`${API}/client/orders?${params}`, { headers: hdrs });
      const d = await res.json();
      setOrders(d.data || []);
      setPage(d.current_page || 1);
      setLastPage(d.last_page || 1);
      setTotal(d.total || 0);
    } finally { setLoading(false); }
  };

  useEffect(() => { if (token) fetchOrders(); }, [token]);
  useEffect(() => { if (token) fetchOrders(1); }, [filterStatus, searchQ]);

  // Auto-open an order from URL param
  useEffect(() => {
    const orderId = searchParams.get("order");
    if (orderId && orders.length > 0) {
      const found = orders.find((o) => o.id === Number(orderId));
      if (found) setSelected(found);
    }
  }, [searchParams, orders]);

  const cardCls = `rounded-2xl border ${s.card}`;
  const inputCls = `w-full rounded-xl border ${s.isDark ? "bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30" : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"} px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30`;

  return (
    <div className="space-y-4 max-w-5xl">
      <div>
        <h2 className={`text-lg font-bold ${s.textPrimary}`}>Meus Pedidos</h2>
        <p className={`text-xs ${s.textMuted}`}>{total} pedido{total !== 1 ? "s" : ""} no total</p>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setFilterStatus(f.key)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all ${
                filterStatus === f.key ? "bg-orange-500 text-white shadow-sm" : s.btnSecondary
              }`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Buscar pedido..."
            className={`${inputCls} pl-9`}
          />
        </div>
      </div>

      {/* Orders List */}
      <div className={cardCls}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className={`h-6 w-6 animate-spin ${s.textMuted}`} />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className={`h-10 w-10 ${s.textMuted} mx-auto mb-2 opacity-40`} />
            <p className={`text-xs ${s.textMuted}`}>Nenhum pedido encontrado</p>
          </div>
        ) : (
          <div className={`divide-y ${s.borderLight}`}>
            {orders.map((order) => {
              const st = STATUS_MAP[order.status] || STATUS_MAP.pending;
              return (
                <button
                  key={order.id}
                  onClick={() => setSelected(order)}
                  className={`w-full flex items-center gap-4 p-4 text-left ${s.isDark ? "hover:bg-white/[0.02]" : "hover:bg-gray-50"} transition-colors`}
                >
                  <div className={`h-11 w-11 rounded-xl ${s.isDark ? "bg-white/5" : "bg-gray-100"} flex items-center justify-center shrink-0 overflow-hidden`}>
                    {order.store?.logo ? (
                      <img src={order.store.logo} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Store className={`h-4 w-4 ${s.textMuted}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-xs font-semibold ${s.textPrimary}`}>#{order.order_number}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.color} ${s.isDark ? "bg-white/5" : st.bg}`}>
                        {st.icon} {st.label}
                      </span>
                    </div>
                    <p className={`text-[11px] ${s.textMuted} mt-0.5 truncate`}>
                      {order.store?.name || "Loja"} • {order.items.length} {order.items.length === 1 ? "item" : "itens"} • {formatDate(order.created_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className={`text-xs font-bold ${s.textPrimary}`}>{formatPrice(order.total)}</p>
                    <p className={`text-[10px] ${s.textMuted}`}>{order.payment_method}</p>
                  </div>
                  <Eye className={`h-4 w-4 ${s.textMuted} shrink-0`} />
                </button>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {lastPage > 1 && (
          <div className={`flex items-center justify-between px-4 py-3 border-t ${s.borderLight}`}>
            <p className={`text-[11px] ${s.textMuted}`}>Pagina {page} de {lastPage}</p>
            <div className="flex gap-1.5">
              <button onClick={() => fetchOrders(page - 1)} disabled={page <= 1} className={`p-1.5 rounded-lg ${s.btnSecondary} disabled:opacity-30`}><ChevronLeft className="h-3.5 w-3.5" /></button>
              <button onClick={() => fetchOrders(page + 1)} disabled={page >= lastPage} className={`p-1.5 rounded-lg ${s.btnSecondary} disabled:opacity-30`}><ChevronRight className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Pedido #${selected?.order_number || ""}`} size="lg">
        {selected && (() => {
          const st = STATUS_MAP[selected.status] || STATUS_MAP.pending;
          return (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${st.color} ${s.isDark ? "bg-white/5" : st.bg}`}>
                  {st.icon} {st.label}
                </span>
                <span className={`text-[11px] ${s.textMuted}`}>{formatDate(selected.created_at)}</span>
              </div>

              {/* Store */}
              {selected.store && (
                <div className={`flex items-center gap-3 p-3 rounded-xl ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}>
                  <div className="h-9 w-9 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    {selected.store.logo ? <img src={selected.store.logo} alt="" className="h-full w-full object-cover" /> : <Store className="h-4 w-4 text-gray-400 m-auto mt-2.5" />}
                  </div>
                  <div>
                    <p className={`text-xs font-semibold ${s.textPrimary}`}>{selected.store.name}</p>
                    <p className={`text-[10px] ${s.textMuted}`}>/{selected.store.slug}</p>
                  </div>
                </div>
              )}

              {/* Items */}
              <div>
                <p className={`text-[10px] ${s.textMuted} uppercase tracking-wider mb-2`}>Itens do Pedido</p>
                <div className={`rounded-xl border ${s.borderLight} divide-y ${s.borderLight}`}>
                  {selected.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3">
                      <div className="h-12 w-12 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                        {item.product_image ? <img src={item.product_image} alt="" className="h-full w-full object-cover" /> : <Package className="h-4 w-4 text-gray-400 m-auto mt-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium ${s.textPrimary} truncate`}>{item.product_name}</p>
                        <p className={`text-[10px] ${s.textMuted}`}>{formatPrice(item.price)} x {item.quantity}</p>
                      </div>
                      <p className={`text-xs font-semibold ${s.textPrimary}`}>{formatPrice(item.total)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className={`rounded-xl p-3 ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"} space-y-1.5`}>
                <div className="flex justify-between text-xs">
                  <span className={s.textMuted}>Subtotal</span>
                  <span className={s.textSecondary}>{formatPrice(selected.subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className={s.textMuted}>Entrega</span>
                  <span className={s.textSecondary}>{formatPrice(selected.delivery_fee)}</span>
                </div>
                <div className={`flex justify-between text-xs font-bold pt-1.5 border-t ${s.borderLight}`}>
                  <span className={s.textPrimary}>Total</span>
                  <span className="text-orange-500">{formatPrice(selected.total)}</span>
                </div>
              </div>

              {/* Delivery Info */}
              <div className={`rounded-xl p-3 ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"} space-y-2`}>
                <p className={`text-[10px] ${s.textMuted} uppercase tracking-wider`}>Dados de Entrega</p>
                <div className="space-y-1.5">
                  <p className={`text-xs ${s.textSecondary} flex items-center gap-1.5`}><MapPin className="h-3 w-3 shrink-0" /> {selected.customer_address}, {selected.customer_province}</p>
                  <p className={`text-xs ${s.textSecondary} flex items-center gap-1.5`}><Phone className="h-3 w-3 shrink-0" /> {selected.customer_phone}</p>
                  <p className={`text-xs ${s.textSecondary} flex items-center gap-1.5`}><CreditCard className="h-3 w-3 shrink-0" /> {selected.payment_method}</p>
                  {selected.customer_notes && (
                    <p className={`text-xs ${s.textSecondary} flex items-center gap-1.5`}><FileText className="h-3 w-3 shrink-0" /> {selected.customer_notes}</p>
                  )}
                </div>
              </div>

              {/* Timeline */}
              {(selected.confirmed_at || selected.shipped_at || selected.delivered_at || selected.cancelled_at) && (
                <div className={`rounded-xl p-3 ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"} space-y-2`}>
                  <p className={`text-[10px] ${s.textMuted} uppercase tracking-wider`}>Historico</p>
                  <div className="space-y-1.5">
                    <p className={`text-[11px] ${s.textSecondary}`}>Criado: {formatDate(selected.created_at)}</p>
                    {selected.confirmed_at && <p className={`text-[11px] text-blue-500`}>Confirmado: {formatDate(selected.confirmed_at)}</p>}
                    {selected.shipped_at && <p className={`text-[11px] text-cyan-500`}>Enviado: {formatDate(selected.shipped_at)}</p>}
                    {selected.delivered_at && <p className={`text-[11px] text-emerald-500`}>Entregue: {formatDate(selected.delivered_at)}</p>}
                    {selected.cancelled_at && <p className={`text-[11px] text-red-500`}>Cancelado: {formatDate(selected.cancelled_at)}</p>}
                    {selected.cancel_reason && <p className={`text-[11px] ${s.textMuted}`}>Motivo: {selected.cancel_reason}</p>}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
