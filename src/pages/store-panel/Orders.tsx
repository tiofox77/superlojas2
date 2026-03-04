import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Package, Loader2, CheckCircle2, XCircle, Clock, Truck, Search,
  RefreshCw, ChevronLeft, ChevronRight, Eye, X, AlertTriangle,
  ShoppingBag, MapPin, Phone, Mail, CreditCard, FileText, Image, ExternalLink, PackageCheck
} from "lucide-react";
import { useToastNotification } from "@/contexts/ToastContext";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

interface OrderItem {
  id: number; product_name: string; product_image: string | null;
  price: number; quantity: number; total: number;
}

interface Order {
  id: number; order_number: string; type: string; status: string;
  customer_name: string; customer_email: string; customer_phone: string;
  customer_address: string; customer_province: string; customer_notes: string | null;
  payment_method: string; payment_receipt: string | null;
  subtotal: number; delivery_fee: number; total: number;
  cancel_reason: string | null; admin_notes: string | null;
  confirmed_at: string | null; shipped_at: string | null; delivered_at: string | null;
  cancelled_at: string | null; created_at: string;
  items: OrderItem[];
}

interface Stats {
  total: number; total_orders: number; total_preorders: number;
  pending: number; confirmed: number; processing: number;
  shipped: number; delivered: number; cancelled: number; revenue: number; today: number;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:    { label: "Pendente",       color: "text-amber-600",   bg: "bg-amber-50 dark:bg-amber-500/10",   icon: <Clock className="h-3 w-3" /> },
  confirmed:  { label: "Confirmado",     color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-500/10",     icon: <CheckCircle2 className="h-3 w-3" /> },
  processing: { label: "Em Preparacao",  color: "text-violet-600",  bg: "bg-violet-50 dark:bg-violet-500/10", icon: <Package className="h-3 w-3" /> },
  shipped:    { label: "Enviado",        color: "text-cyan-600",    bg: "bg-cyan-50 dark:bg-cyan-500/10",     icon: <Truck className="h-3 w-3" /> },
  delivered:  { label: "Entregue",       color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-500/10", icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled:  { label: "Cancelado",      color: "text-red-600",     bg: "bg-red-50 dark:bg-red-500/10",       icon: <XCircle className="h-3 w-3" /> },
};

const STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

export default function StorePanelOrders() {
  const { slug } = useParams<{ slug: string }>();
  const { token } = useAuth();
  const s = useAdminStyles();
  const toast = useToastNotification();

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState<"all" | "order" | "preorder">("all");
  const [searchQ, setSearchQ] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const hdrs = { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" };
  const formatPrice = (v: number) => new Intl.NumberFormat("pt-AO").format(v);
  const formatDate = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString("pt", { day: "2-digit", month: "2-digit", year: "2-digit" }) + " " +
           dt.toLocaleTimeString("pt", { hour: "2-digit", minute: "2-digit" });
  };

  const fetchOrders = async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), per_page: "20" });
      if (filterType !== "all") params.set("type", filterType);
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (searchQ) params.set("search", searchQ);
      const res = await fetch(`${API}/store-panel/${slug}/orders?${params}`, { headers: hdrs });
      const d = await res.json();
      setOrders(d.data || []);
      setPage(d.current_page || 1);
      setLastPage(d.last_page || 1);
      setTotal(d.total || 0);
    } catch { toast.error("Erro ao carregar pedidos"); }
    finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API}/store-panel/${slug}/orders/stats`, { headers: hdrs });
      setStats(await res.json());
    } catch {}
  };

  useEffect(() => { if (token && slug) { fetchOrders(); fetchStats(); } }, [token, slug]);
  useEffect(() => { if (token && slug) fetchOrders(1); }, [filterStatus, filterType, searchQ]);

  const updateStatus = async (order: Order, newStatus: string) => {
    setUpdating(true);
    try {
      const body: Record<string, string> = { status: newStatus };
      if (newStatus === "cancelled" && cancelReason) body.cancel_reason = cancelReason;
      const res = await fetch(`${API}/store-panel/${slug}/orders/${order.id}/status`, {
        method: "PUT", headers: hdrs, body: JSON.stringify(body),
      });
      const d = await res.json();
      if (res.ok) {
        toast.success("Actualizado", d.message);
        setSelected(d.order);
        fetchOrders(page);
        fetchStats();
        setCancelReason("");
      } else toast.error("Erro", d.message);
    } catch { toast.error("Erro de conexao"); }
    finally { setUpdating(false); }
  };

  const cardCls = `rounded-2xl border ${s.card} p-5`;
  const inputCls = `w-full ${s.input} border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20`;

  const StatCard = ({ label, value, color, icon: Icon }: { label: string; value: number | string; color: string; icon: React.ElementType }) => (
    <div className={`${cardCls} flex items-center gap-3`}>
      <div className={`h-9 w-9 rounded-xl ${s.isDark ? `${color.replace("text-","bg-")}/10` : `${color.replace("text-","bg-")}/10`} flex items-center justify-center`}>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div>
        <p className={`text-base font-bold ${s.textPrimary}`}>{value}</p>
        <p className={`text-[10px] ${s.textMuted}`}>{label}</p>
      </div>
    </div>
  );

  if (loading && orders.length === 0) return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className={`rounded-2xl border ${s.card} p-6 animate-pulse`}>
          <div className={`h-5 w-32 ${s.skeleton} rounded mb-4`} />
          <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, j) => <div key={j} className={`h-10 ${s.skeleton} rounded-xl`} />)}</div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className={`text-lg font-bold ${s.textPrimary}`}>Pedidos</h2>
          <p className={`text-xs ${s.textMuted}`}>Gerir pedidos e encomendas da sua loja</p>
        </div>
        <div className={`inline-flex rounded-xl border ${s.borderLight} overflow-hidden text-xs`}>
          {(["all", "order", "preorder"] as const).map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-4 py-2 font-medium transition-colors ${
                filterType === t
                  ? s.isDark ? "bg-emerald-500/15 text-emerald-400" : "bg-emerald-50 text-emerald-700"
                  : `${s.textMuted} ${s.isDark ? "hover:bg-white/[0.04]" : "hover:bg-gray-50"}`
              }`}>
              {t === "all" ? `Todos${stats ? ` (${stats.total})` : ""}` : t === "order" ? `Pedidos${stats ? ` (${stats.total_orders})` : ""}` : `Encomendas${stats ? ` (${stats.total_preorders})` : ""}`}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          <StatCard label="Pendentes" value={stats.pending} color="text-amber-500" icon={Clock} />
          <StatCard label="Confirmados" value={stats.confirmed} color="text-blue-500" icon={CheckCircle2} />
          <StatCard label="Enviados" value={stats.shipped} color="text-cyan-500" icon={Truck} />
          <StatCard label="Entregues" value={stats.delivered} color="text-emerald-500" icon={CheckCircle2} />
          <StatCard label="Receita" value={`${formatPrice(stats.revenue)} Kz`} color="text-orange-500" icon={ShoppingBag} />
        </div>
      )}

      {/* Filters */}
      <div className={cardCls}>
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className={`h-4 w-4 ${s.textMuted}`} />
            <input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Pesquisar por n.o pedido, nome, email, telefone..." className={inputCls} />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={`${inputCls} w-auto`}>
            <option value="all">Todos</option>
            {STATUSES.map(st => <option key={st} value={st}>{STATUS_MAP[st]?.label || st}</option>)}
          </select>
          <button onClick={() => { fetchOrders(page); fetchStats(); }} className={`px-3 py-2 rounded-xl text-xs font-medium ${s.btnSecondary}`}>
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className={`border-b ${s.borderLight}`}>
                <th className={`text-left py-2.5 px-3 ${s.textMuted} font-semibold`}>Pedido</th>
                <th className={`text-left py-2.5 px-3 ${s.textMuted} font-semibold`}>Cliente</th>
                <th className={`text-left py-2.5 px-3 ${s.textMuted} font-semibold`}>Itens</th>
                <th className={`text-left py-2.5 px-3 ${s.textMuted} font-semibold`}>Total</th>
                <th className={`text-left py-2.5 px-3 ${s.textMuted} font-semibold`}>Status</th>
                <th className={`text-left py-2.5 px-3 ${s.textMuted} font-semibold`}>Data</th>
                <th className={`text-right py-2.5 px-3 ${s.textMuted} font-semibold`}></th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr><td colSpan={7} className={`text-center py-12 ${s.textMuted}`}>Nenhum pedido encontrado</td></tr>
              )}
              {orders.map((o) => {
                const st = STATUS_MAP[o.status] || STATUS_MAP.pending;
                return (
                  <tr key={o.id} className={`border-b ${s.borderLight} hover:${s.isDark ? "bg-white/[0.02]" : "bg-gray-50"} transition-colors cursor-pointer`}
                    onClick={() => setSelected(o)}>
                    <td className={`py-2.5 px-3 ${s.textPrimary}`}>
                      <span className="font-mono font-semibold">{o.order_number}</span>
                      {o.type === "preorder" && (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                          <PackageCheck className="h-2.5 w-2.5" /> Encomenda
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <p className={`font-medium ${s.textPrimary}`}>{o.customer_name}</p>
                      <p className={`text-[10px] ${s.textMuted}`}>{o.customer_phone}</p>
                    </td>
                    <td className={`py-2.5 px-3 ${s.textMuted}`}>{o.items?.length || 0} itens</td>
                    <td className={`py-2.5 px-3 font-semibold ${s.textPrimary}`}>{formatPrice(o.total)} Kz</td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.bg} ${st.color}`}>
                        {st.icon} {st.label}
                      </span>
                    </td>
                    <td className={`py-2.5 px-3 ${s.textMuted} whitespace-nowrap`}>{formatDate(o.created_at)}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button className={`p-1.5 rounded-lg ${s.textMuted} hover:text-orange-500`}><Eye className="h-3.5 w-3.5" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {lastPage > 1 && (
          <div className="flex items-center justify-between pt-4">
            <p className={`text-[11px] ${s.textMuted}`}>{total} pedidos — pagina {page}/{lastPage}</p>
            <div className="flex gap-1">
              <button onClick={() => fetchOrders(page - 1)} disabled={page <= 1} className={`p-2 rounded-lg ${s.btnSecondary} disabled:opacity-30`}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => fetchOrders(page + 1)} disabled={page >= lastPage} className={`p-2 rounded-lg ${s.btnSecondary} disabled:opacity-30`}>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════ ORDER DETAIL MODAL ═══════════ */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelected(null)}>
          <div className={`${s.isDark ? "bg-[#1a1c23]" : "bg-white"} rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden`} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className={`flex items-center justify-between px-5 py-3 border-b ${s.borderLight}`}>
              <div>
                <h3 className={`text-sm font-bold ${s.textPrimary}`}>
                  {selected.type === "preorder" ? "Encomenda" : "Pedido"} #{selected.order_number}
                </h3>
                <p className={`text-[10px] ${s.textMuted}`}>{formatDate(selected.created_at)}</p>
              </div>
              <button onClick={() => setSelected(null)} className={`p-1 rounded-lg ${s.textMuted} hover:text-red-500`}><X className="h-4 w-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Status */}
              <div className="flex items-center gap-2">
                {(() => { const st = STATUS_MAP[selected.status] || STATUS_MAP.pending; return (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${st.bg} ${st.color}`}>{st.icon} {st.label}</span>
                ); })()}
                <span className={`text-xs ${s.textMuted}`}>— {formatPrice(selected.total)} Kz</span>
              </div>

              {/* Items */}
              <div>
                <h4 className={`text-xs font-semibold ${s.textPrimary} mb-2`}>Itens</h4>
                <div className={`rounded-xl border ${s.borderLight} divide-y ${s.isDark ? "divide-white/5" : "divide-gray-100"}`}>
                  {selected.items?.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3">
                      {item.product_image && <img src={item.product_image} alt="" className="h-10 w-10 rounded-lg object-cover" />}
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium ${s.textPrimary} truncate`}>{item.product_name}</p>
                        <p className={`text-[10px] ${s.textMuted}`}>x{item.quantity} — {formatPrice(item.price)} Kz/un</p>
                      </div>
                      <span className={`text-xs font-semibold ${s.textPrimary}`}>{formatPrice(item.total)} Kz</span>
                    </div>
                  ))}
                </div>
                <div className={`flex justify-between mt-2 text-xs ${s.textMuted}`}>
                  <span>Subtotal</span><span>{formatPrice(selected.subtotal)} Kz</span>
                </div>
                <div className={`flex justify-between text-xs ${s.textMuted}`}>
                  <span>Entrega</span><span>{formatPrice(selected.delivery_fee)} Kz</span>
                </div>
                <div className={`flex justify-between mt-1 text-sm font-bold ${s.textPrimary}`}>
                  <span>Total</span><span className="text-orange-500">{formatPrice(selected.total)} Kz</span>
                </div>
              </div>

              {/* Customer */}
              <div>
                <h4 className={`text-xs font-semibold ${s.textPrimary} mb-2`}>Cliente</h4>
                <div className={`rounded-xl border ${s.borderLight} p-3 space-y-1.5`}>
                  <div className="flex items-center gap-2 text-xs"><Mail className={`h-3 w-3 ${s.textMuted}`} /><span className={s.textPrimary}>{selected.customer_name}</span></div>
                  <div className="flex items-center gap-2 text-xs"><Phone className={`h-3 w-3 ${s.textMuted}`} /><span className={s.textPrimary}>{selected.customer_phone}</span></div>
                  <div className="flex items-center gap-2 text-xs"><Mail className={`h-3 w-3 ${s.textMuted}`} /><span className={s.textMuted}>{selected.customer_email}</span></div>
                  <div className="flex items-center gap-2 text-xs"><MapPin className={`h-3 w-3 ${s.textMuted}`} /><span className={s.textMuted}>{selected.customer_address}, {selected.customer_province}</span></div>
                  <div className="flex items-center gap-2 text-xs"><CreditCard className={`h-3 w-3 ${s.textMuted}`} /><span className={s.textMuted}>{selected.payment_method}</span></div>
                  {selected.customer_notes && (
                    <div className="flex items-start gap-2 text-xs"><FileText className={`h-3 w-3 ${s.textMuted} mt-0.5`} /><span className={s.textMuted}>{selected.customer_notes}</span></div>
                  )}
                </div>
              </div>

              {/* Payment Receipt */}
              {selected.payment_receipt && (
                <div>
                  <h4 className={`text-xs font-semibold ${s.textPrimary} mb-2`}>Comprovante de Pagamento</h4>
                  <div className={`rounded-xl border ${s.borderLight} p-3`}>
                    {selected.payment_receipt.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <div className="space-y-2">
                        <img src={selected.payment_receipt} alt="Comprovante" className="w-full max-h-64 object-contain rounded-lg bg-gray-50" />
                        <a href={selected.payment_receipt} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-blue-600 hover:underline">
                          <ExternalLink className="h-3 w-3" /> Abrir em tamanho completo
                        </a>
                      </div>
                    ) : selected.payment_receipt.match(/\.pdf$/i) ? (
                      <a href={selected.payment_receipt} target="_blank" rel="noopener noreferrer"
                        className={`flex items-center gap-3 p-2 rounded-lg ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"} hover:opacity-80`}>
                        <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5 text-red-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium ${s.textPrimary}`}>Comprovante PDF</p>
                          <p className={`text-[10px] ${s.textMuted}`}>Clique para abrir</p>
                        </div>
                        <ExternalLink className={`h-3.5 w-3.5 ${s.textMuted}`} />
                      </a>
                    ) : (
                      <a href={selected.payment_receipt} target="_blank" rel="noopener noreferrer"
                        className={`flex items-center gap-3 p-2 rounded-lg ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"} hover:opacity-80`}>
                        <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                          <Image className="h-5 w-5 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium ${s.textPrimary}`}>Ver comprovante</p>
                          <p className={`text-[10px] ${s.textMuted}`}>Clique para abrir</p>
                        </div>
                        <ExternalLink className={`h-3.5 w-3.5 ${s.textMuted}`} />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Change Status */}
              {selected.status !== "delivered" && selected.status !== "cancelled" && (
                <div>
                  <h4 className={`text-xs font-semibold ${s.textPrimary} mb-2`}>Alterar Estado</h4>
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.filter(st => st !== selected.status).map(st => {
                      const m = STATUS_MAP[st];
                      const isCancelling = st === "cancelled";
                      return (
                        <button key={st} onClick={() => { if (!isCancelling) updateStatus(selected, st); }}
                          disabled={updating}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium ${m.bg} ${m.color} hover:opacity-80 disabled:opacity-40 transition-colors`}>
                          {updating ? <Loader2 className="h-3 w-3 animate-spin" /> : m.icon} {m.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Cancel with reason */}
                  {selected.status !== "cancelled" && (
                    <div className="mt-3 space-y-2">
                      <input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Motivo do cancelamento (opcional)..." className={inputCls} />
                      <button onClick={() => updateStatus(selected, "cancelled")} disabled={updating}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-red-50 dark:bg-red-500/10 text-red-600 hover:opacity-80 disabled:opacity-40`}>
                        {updating ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />} Cancelar Pedido
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Cancel reason display */}
              {selected.status === "cancelled" && selected.cancel_reason && (
                <div className={`rounded-xl p-3 ${s.isDark ? "bg-red-500/5 border border-red-500/10" : "bg-red-50 border border-red-100"}`}>
                  <p className="text-xs text-red-600 font-medium">Motivo do cancelamento:</p>
                  <p className={`text-xs ${s.textMuted} mt-1`}>{selected.cancel_reason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
