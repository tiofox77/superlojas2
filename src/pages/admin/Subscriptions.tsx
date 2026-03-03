import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import Modal from "@/components/admin/Modal";
import { useEffect, useState } from "react";
import {
  CreditCard, Crown, Loader2, Check, X, Search, Filter,
  Calendar, Store, RefreshCw, Ban, Play, Eye, ChevronLeft, ChevronRight,
  TrendingUp, Clock, AlertTriangle, DollarSign, FileImage, ExternalLink
} from "lucide-react";
import { useToastNotification } from "@/contexts/ToastContext";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

interface SubItem {
  id: number;
  status: string;
  starts_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
  auto_renew: boolean;
  payment_method: string | null;
  payment_reference: string | null;
  payment_proof: string | null;
  amount_paid: string;
  currency: string;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  store: { id: number; name: string; slug: string; logo: string } | null;
  plan: { id: number; name: string; slug: string; price: string; billing_cycle: string; is_free: boolean } | null;
}

interface Stats {
  total: number; active: number; pending: number; expired: number;
  cancelled: number; expiring_soon: number; revenue_month: number;
}

interface PlanOption { id: number; name: string; slug: string; price: string; is_free: boolean }
interface StoreOption { id: number; name: string; slug: string }

const STATUS_MAP: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  active: { label: "Activa", cls: "bg-emerald-100 text-emerald-700", icon: Check },
  pending: { label: "Pendente", cls: "bg-amber-100 text-amber-700", icon: Clock },
  expired: { label: "Expirada", cls: "bg-red-100 text-red-700", icon: AlertTriangle },
  cancelled: { label: "Cancelada", cls: "bg-gray-200 text-gray-600", icon: Ban },
  trial: { label: "Trial", cls: "bg-blue-100 text-blue-700", icon: Play },
};

export default function AdminSubscriptions() {
  const { token } = useAuth();
  const s = useAdminStyles();
  const toast = useToastNotification();

  const [subs, setSubs] = useState<SubItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [allPlans, setAllPlans] = useState<PlanOption[]>([]);
  const [allStores, setAllStores] = useState<StoreOption[]>([]);
  const [cStore, setCStore] = useState("");
  const [cPlan, setCPlan] = useState("");
  const [cPayMethod, setCPayMethod] = useState("");
  const [cPayRef, setCPayRef] = useState("");
  const [cAmount, setCAmount] = useState("");
  const [cNotes, setCNotes] = useState("");
  const [cStatus, setCStatus] = useState("active");
  const [creating, setCreating] = useState(false);

  // Action modal
  const [actionSub, setActionSub] = useState<SubItem | null>(null);
  const [actionType, setActionType] = useState<"activate" | "cancel" | "renew" | "view">("view");
  const [actionPayMethod, setActionPayMethod] = useState("");
  const [actionPayRef, setActionPayRef] = useState("");
  const [actionAmount, setActionAmount] = useState("");
  const [actionNotes, setActionNotes] = useState("");
  const [actioning, setActioning] = useState(false);

  // Expiry check
  const [checkingExpiry, setCheckingExpiry] = useState(false);
  const [expiryStatus, setExpiryStatus] = useState<{ last_run: string | null; next_auto_check: string } | null>(null);

  const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };

  const fetchSubs = () => {
    setLoading(true);
    let url = `${API}/admin/subscriptions?page=${page}&per_page=15`;
    if (statusFilter) url += `&status=${statusFilter}`;
    fetch(url, { headers })
      .then((r) => r.json())
      .then((d) => {
        setSubs(d.data || []);
        setLastPage(d.last_page || 1);
        setTotal(d.total || 0);
      })
      .finally(() => setLoading(false));
  };

  const fetchStats = () => {
    fetch(`${API}/admin/subscriptions/stats`, { headers })
      .then((r) => r.json())
      .then(setStats);
  };

  const fetchMeta = () => {
    fetch(`${API}/admin/plans`, { headers }).then((r) => r.json()).then((d) => setAllPlans(Array.isArray(d) ? d : []));
    fetch(`${API}/admin/stores`, { headers }).then((r) => r.json()).then((d: any) => setAllStores(Array.isArray(d) ? d : (d?.data || [])));
  };

  const fetchExpiryStatus = () => {
    fetch(`${API}/admin/subscriptions/expiry-status`, { headers })
      .then((r) => r.json())
      .then(setExpiryStatus);
  };

  const runExpiryCheck = async () => {
    setCheckingExpiry(true);
    try {
      const res = await fetch(`${API}/admin/subscriptions/check-expiry`, { method: "POST", headers });
      const d = await res.json();
      toast.success("Verificacao concluida", d.message);
      fetchSubs(); fetchStats(); fetchExpiryStatus();
    } catch { toast.error("Erro", "Falha ao verificar subscricoes."); }
    finally { setCheckingExpiry(false); }
  };

  useEffect(() => { fetchStats(); fetchMeta(); fetchExpiryStatus(); }, [token]);
  useEffect(() => { fetchSubs(); }, [token, page, statusFilter]);

  const formatPrice = (p: string | number) => {
    const n = typeof p === "string" ? parseFloat(p) : p;
    if (n === 0) return "Gratis";
    return new Intl.NumberFormat("pt-AO", { minimumFractionDigits: 0 }).format(n) + " Kz";
  };
  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("pt-PT") : "—";

  const createSubscription = async () => {
    if (!cStore || !cPlan) { toast.error("Erro", "Seleccione loja e plano."); return; }
    setCreating(true);
    try {
      const res = await fetch(`${API}/admin/subscriptions`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: parseInt(cStore), plan_id: parseInt(cPlan),
          payment_method: cPayMethod || null, payment_reference: cPayRef || null,
          amount_paid: cAmount ? parseFloat(cAmount) : null, notes: cNotes || null, status: cStatus,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        toast.success("Subscricao criada"); setCreateOpen(false);
        fetchSubs(); fetchStats();
      } else toast.error("Erro", d.message || JSON.stringify(d.errors));
    } finally { setCreating(false); }
  };

  const doAction = async () => {
    if (!actionSub) return;
    setActioning(true);
    const body: Record<string, unknown> = {};
    if (actionPayMethod) body.payment_method = actionPayMethod;
    if (actionPayRef) body.payment_reference = actionPayRef;
    if (actionAmount) body.amount_paid = parseFloat(actionAmount);
    if (actionNotes) body.notes = actionNotes;

    try {
      const res = await fetch(`${API}/admin/subscriptions/${actionSub.id}/${actionType}`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (res.ok) {
        toast.success("Sucesso", d.message); setActionSub(null);
        fetchSubs(); fetchStats();
      } else toast.error("Erro", d.message || "Erro.");
    } finally { setActioning(false); }
  };

  const openAction = (sub: SubItem, type: "activate" | "cancel" | "renew" | "view") => {
    setActionSub(sub); setActionType(type);
    setActionPayMethod(sub.payment_method || ""); setActionPayRef("");
    setActionAmount(sub.plan ? sub.plan.price : ""); setActionNotes("");
  };

  const inputCls = `w-full ${s.input} border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-bold ${s.textPrimary}`}>Subscricoes</h2>
          <p className={`text-xs ${s.textMuted}`}>{total} subscricoes no total</p>
        </div>
        <button onClick={() => { setCreateOpen(true); setCStore(""); setCPlan(""); setCPayMethod(""); setCPayRef(""); setCAmount(""); setCNotes(""); setCStatus("active"); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${s.btnPrimary} text-xs font-semibold shadow-sm`}>
          <CreditCard className="h-4 w-4" /> Nova Subscricao
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: "Total", value: stats.total, icon: CreditCard, color: "blue" },
            { label: "Activas", value: stats.active, icon: Check, color: "emerald" },
            { label: "Pendentes", value: stats.pending, icon: Clock, color: "amber" },
            { label: "Expiradas", value: stats.expired, icon: AlertTriangle, color: "red" },
            { label: "Canceladas", value: stats.cancelled, icon: Ban, color: "gray" },
            { label: "A expirar", value: stats.expiring_soon, icon: Calendar, color: "orange" },
            { label: "Receita/mes", value: formatPrice(stats.revenue_month), icon: DollarSign, color: "purple" },
          ].map((st) => (
            <div key={st.label} className={`rounded-xl border ${s.card} p-3 text-center`}>
              <st.icon className={`h-4 w-4 text-${st.color}-500 mx-auto mb-1`} />
              <p className={`text-sm font-bold ${s.textPrimary}`}>{st.value}</p>
              <p className={`text-[9px] ${s.textMuted} uppercase tracking-wider`}>{st.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Expiry check + Filters */}
      <div className={`rounded-xl border ${s.card} p-3 flex flex-wrap items-center justify-between gap-3`}>
        <div className="flex gap-2 flex-wrap">
          {["", "active", "pending", "expired", "cancelled"].map((f) => (
            <button key={f} onClick={() => { setStatusFilter(f); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${
                statusFilter === f ? `${s.btnPrimary}` : `${s.isDark ? "bg-white/[0.04] text-white/60" : "bg-gray-100 text-gray-500"} hover:opacity-80`
              }`}>
              {f === "" ? "Todas" : STATUS_MAP[f]?.label || f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {expiryStatus && (
            <div className={`text-[9px] ${s.textMuted} text-right leading-tight`}>
              <p>Ultima verificacao: {expiryStatus.last_run ? new Date(expiryStatus.last_run).toLocaleString("pt-PT") : "Nunca"}</p>
              <p>{expiryStatus.next_auto_check}</p>
            </div>
          )}
          <button onClick={runExpiryCheck} disabled={checkingExpiry}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${s.isDark ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20" : "bg-amber-50 text-amber-600 hover:bg-amber-100"} disabled:opacity-50`}>
            {checkingExpiry ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Verificar Expiradas
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-orange-500" /></div>
      ) : subs.length === 0 ? (
        <div className={`rounded-2xl border ${s.card} py-16 text-center`}>
          <CreditCard className={`h-10 w-10 ${s.empty} mx-auto mb-3`} />
          <p className={`text-sm ${s.textMuted}`}>Nenhuma subscricao encontrada.</p>
        </div>
      ) : (
        <div className={`rounded-2xl border ${s.card} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className={`border-b ${s.borderLight} ${s.isDark ? "bg-white/[0.02]" : "bg-gray-50"}`}>
                  <th className={`text-left px-4 py-3 font-semibold ${s.textMuted} uppercase tracking-wider text-[10px]`}>Loja</th>
                  <th className={`text-left px-4 py-3 font-semibold ${s.textMuted} uppercase tracking-wider text-[10px]`}>Plano</th>
                  <th className={`text-left px-4 py-3 font-semibold ${s.textMuted} uppercase tracking-wider text-[10px]`}>Status</th>
                  <th className={`text-left px-4 py-3 font-semibold ${s.textMuted} uppercase tracking-wider text-[10px]`}>Periodo</th>
                  <th className={`text-left px-4 py-3 font-semibold ${s.textMuted} uppercase tracking-wider text-[10px]`}>Valor</th>
                  <th className={`text-left px-4 py-3 font-semibold ${s.textMuted} uppercase tracking-wider text-[10px]`}>Pagamento</th>
                  <th className={`text-right px-4 py-3 font-semibold ${s.textMuted} uppercase tracking-wider text-[10px]`}>Accoes</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${s.borderLight}`}>
                {subs.map((sub) => {
                  const st = STATUS_MAP[sub.status] || { label: sub.status, cls: "bg-gray-100", icon: Clock };
                  return (
                    <tr key={sub.id} className={`${s.isDark ? "hover:bg-white/[0.02]" : "hover:bg-gray-50"} transition-colors`}>
                      <td className="px-4 py-3">
                        <p className={`font-semibold ${s.textPrimary}`}>{sub.store?.name || "—"}</p>
                        <p className={`text-[10px] ${s.textMuted}`}>{sub.store?.slug || ""}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${s.isDark ? "bg-white/[0.06]" : "bg-gray-100"} ${s.textPrimary}`}>
                          <Crown className="h-2.5 w-2.5 text-orange-500" /> {sub.plan?.name || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${st.cls}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className={`text-[10px] ${s.textSecondary}`}>{fmtDate(sub.starts_at)} → {sub.expires_at ? fmtDate(sub.expires_at) : "∞"}</p>
                        {sub.auto_renew && <p className="text-[9px] text-emerald-500">Renovacao auto (aguarda pagamento)</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${s.textPrimary}`}>{formatPrice(sub.amount_paid)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className={`text-[10px] ${s.textSecondary}`}>{sub.payment_method || "—"}</p>
                        {sub.payment_proof && (
                          <a href={sub.payment_proof} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[9px] text-orange-500 hover:text-orange-600 mt-0.5">
                            <FileImage className="h-3 w-3" /> Comprovativo
                          </a>
                        )}
                        {!sub.payment_proof && sub.payment_reference && <p className={`text-[9px] ${s.textMuted} truncate max-w-[100px]`}>{sub.payment_reference}</p>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {sub.status === "pending" && (
                            <button onClick={() => openAction(sub, "activate")} title="Activar"
                              className={`p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 transition-colors`}>
                              <Play className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {sub.status === "active" && (
                            <>
                              <button onClick={() => openAction(sub, "renew")} title="Renovar"
                                className={`p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors`}>
                                <RefreshCw className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => openAction(sub, "cancel")} title="Cancelar"
                                className={`p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors`}>
                                <Ban className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                          {sub.status === "expired" && (
                            <button onClick={() => openAction(sub, "renew")} title="Renovar"
                              className={`p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors`}>
                              <RefreshCw className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {lastPage > 1 && (
            <div className={`flex items-center justify-between px-4 py-3 border-t ${s.borderLight}`}>
              <span className={`text-[10px] ${s.textMuted}`}>Pagina {page} de {lastPage}</span>
              <div className="flex gap-1">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                  className={`p-1.5 rounded-lg ${s.textMuted} hover:text-orange-500 disabled:opacity-30`}><ChevronLeft className="h-4 w-4" /></button>
                <button onClick={() => setPage(Math.min(lastPage, page + 1))} disabled={page === lastPage}
                  className={`p-1.5 rounded-lg ${s.textMuted} hover:text-orange-500 disabled:opacity-30`}><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── CREATE MODAL ─── */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nova Subscricao" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-[10px] font-medium ${s.textMuted} mb-1 block`}>Loja *</label>
              <select value={cStore} onChange={(e) => setCStore(e.target.value)} className={inputCls}>
                <option value="">Seleccionar loja...</option>
                {allStores.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
              </select>
            </div>
            <div>
              <label className={`text-[10px] font-medium ${s.textMuted} mb-1 block`}>Plano *</label>
              <select value={cPlan} onChange={(e) => { setCPlan(e.target.value); const p = allPlans.find((x) => x.id === parseInt(e.target.value)); if (p) setCAmount(p.price); }}
                className={inputCls}>
                <option value="">Seleccionar plano...</option>
                {allPlans.map((p) => <option key={p.id} value={p.id}>{p.name} — {formatPrice(p.price)}</option>)}
              </select>
            </div>
            <div>
              <label className={`text-[10px] font-medium ${s.textMuted} mb-1 block`}>Status</label>
              <select value={cStatus} onChange={(e) => setCStatus(e.target.value)} className={inputCls}>
                <option value="active">Activa (pago)</option>
                <option value="pending">Pendente (aguardar pagamento)</option>
                <option value="trial">Trial</option>
              </select>
            </div>
            <div>
              <label className={`text-[10px] font-medium ${s.textMuted} mb-1 block`}>Valor (Kz)</label>
              <input type="number" value={cAmount} onChange={(e) => setCAmount(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={`text-[10px] font-medium ${s.textMuted} mb-1 block`}>Metodo Pagamento</label>
              <select value={cPayMethod} onChange={(e) => setCPayMethod(e.target.value)} className={inputCls}>
                <option value="">—</option>
                <option value="transferencia">Transferencia</option>
                <option value="multicaixa">Multicaixa Express</option>
                <option value="unitel_money">Unitel Money</option>
                <option value="cash">Cash</option>
              </select>
            </div>
            <div>
              <label className={`text-[10px] font-medium ${s.textMuted} mb-1 block`}>Referencia</label>
              <input value={cPayRef} onChange={(e) => setCPayRef(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={`text-[10px] font-medium ${s.textMuted} mb-1 block`}>Notas</label>
            <textarea value={cNotes} onChange={(e) => setCNotes(e.target.value)} rows={2} className={`${inputCls} resize-none`} />
          </div>
          <div className={`flex justify-end gap-2 pt-2 border-t ${s.borderLight}`}>
            <button onClick={() => setCreateOpen(false)} className={`px-4 py-2.5 rounded-xl text-xs font-medium ${s.btnSecondary}`}>Cancelar</button>
            <button onClick={createSubscription} disabled={creating}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold ${s.btnPrimary} disabled:opacity-50`}>
              {creating && <Loader2 className="h-4 w-4 animate-spin" />} Criar Subscricao
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── ACTION MODAL ─── */}
      <Modal open={!!actionSub && actionType !== "view"} onClose={() => setActionSub(null)}
        title={actionType === "activate" ? "Activar Subscricao" : actionType === "cancel" ? "Cancelar Subscricao" : "Renovar Subscricao"} size="md">
        {actionSub && (
          <div className="space-y-4">
            <div className={`rounded-xl p-3 ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"} space-y-1`}>
              <p className={`text-xs ${s.textMuted}`}>Loja: <strong className={s.textPrimary}>{actionSub.store?.name}</strong></p>
              <p className={`text-xs ${s.textMuted}`}>Plano: <strong className={s.textPrimary}>{actionSub.plan?.name} — {formatPrice(actionSub.plan?.price || "0")}</strong></p>
            </div>

            {/* Payment proof */}
            {actionSub.payment_proof && (
              <div className={`rounded-xl p-3 border ${s.isDark ? "border-blue-500/20 bg-blue-900/10" : "border-blue-200 bg-blue-50"}`}>
                <p className={`text-[10px] font-bold ${s.isDark ? "text-blue-300" : "text-blue-700"} uppercase tracking-wider mb-2`}>Comprovativo Anexado</p>
                {actionSub.payment_proof.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                  <img src={actionSub.payment_proof} alt="Comprovativo" className="rounded-lg max-h-48 w-auto border" />
                ) : (
                  <a href={actionSub.payment_proof} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-orange-500 hover:text-orange-600 font-medium">
                    <ExternalLink className="h-3.5 w-3.5" /> Abrir comprovativo (PDF)
                  </a>
                )}
              </div>
            )}

            {actionType === "cancel" ? (
              <div className={`rounded-xl p-3 border ${s.isDark ? "border-red-500/20 bg-red-900/10" : "border-red-200 bg-red-50"}`}>
                <p className={`text-xs ${s.isDark ? "text-red-300" : "text-red-700"}`}>
                  A loja sera revertida para o plano gratuito apos o cancelamento.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-[10px] font-medium ${s.textMuted} mb-1 block`}>Metodo Pagamento</label>
                  <select value={actionPayMethod} onChange={(e) => setActionPayMethod(e.target.value)} className={inputCls}>
                    <option value="">—</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="multicaixa">Multicaixa Express</option>
                    <option value="unitel_money">Unitel Money</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label className={`text-[10px] font-medium ${s.textMuted} mb-1 block`}>Referencia</label>
                  <input value={actionPayRef} onChange={(e) => setActionPayRef(e.target.value)} className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className={`text-[10px] font-medium ${s.textMuted} mb-1 block`}>Valor Pago (Kz)</label>
                  <input type="number" value={actionAmount} onChange={(e) => setActionAmount(e.target.value)} className={inputCls} />
                </div>
              </div>
            )}

            <div>
              <label className={`text-[10px] font-medium ${s.textMuted} mb-1 block`}>Notas</label>
              <textarea value={actionNotes} onChange={(e) => setActionNotes(e.target.value)} rows={2} className={`${inputCls} resize-none`} />
            </div>

            <div className={`flex justify-end gap-2 pt-2 border-t ${s.borderLight}`}>
              <button onClick={() => setActionSub(null)} className={`px-4 py-2.5 rounded-xl text-xs font-medium ${s.btnSecondary}`}>Cancelar</button>
              <button onClick={doAction} disabled={actioning}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm disabled:opacity-50 ${
                  actionType === "cancel" ? "bg-red-500 hover:bg-red-600 text-white" : s.btnPrimary
                }`}>
                {actioning && <Loader2 className="h-4 w-4 animate-spin" />}
                {actionType === "activate" ? "Activar" : actionType === "cancel" ? "Cancelar" : "Renovar"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
