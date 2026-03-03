import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  CreditCard, Crown, Star, Sparkles, Globe, Check, X, Loader2,
  Clock, AlertTriangle, ArrowUpRight, RefreshCw, Calendar,
  Package, Image, BarChart3, HeadphonesIcon, ShieldCheck, Key,
  ToggleLeft, ToggleRight, ChevronDown, ChevronUp, History,
  Upload, FileImage, Building2, Phone, Copy, CheckCheck
} from "lucide-react";
import { useToastNotification } from "@/contexts/ToastContext";
import Modal from "@/components/admin/Modal";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

interface CurrentPlan {
  id: number; name: string; slug: string; price: string; billing_cycle: string;
  is_free: boolean; max_products: number; max_images_per_product: number;
  max_hero_slides: number; features: string[]; priority_support: boolean;
  featured_badge: boolean; analytics: boolean; custom_domain: boolean; has_api: boolean;
}

interface CurrentSub {
  id: number; status: string; starts_at: string; expires_at: string | null;
  auto_renew: boolean; days_remaining: number; payment_method: string;
  amount_paid: string; paid_at: string;
}

interface AvailablePlan extends CurrentPlan {
  description: string; is_recommended: boolean; is_current: boolean;
}

interface PayMethodOption {
  id: number; name: string; type: string; bank_name: string | null;
  iban: string | null; account_number: string | null; account_holder: string | null;
  phone_number: string | null; instructions: string | null;
}

interface HistoryItem {
  id: number; status: string; starts_at: string; expires_at: string | null;
  amount_paid: string; payment_method: string; paid_at: string; notes: string;
  plan: { id: number; name: string; slug: string; price: string; billing_cycle: string };
  created_at: string;
}

const PLAN_COLORS = ["from-gray-400 to-gray-500", "from-blue-500 to-blue-600", "from-orange-500 to-pink-500", "from-purple-500 to-indigo-600", "from-amber-500 to-red-500"];
const PLAN_ICONS = [CreditCard, Star, Crown, Sparkles, Globe];
const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  active: { label: "Activa", cls: "bg-emerald-100 text-emerald-700" },
  pending: { label: "Pendente", cls: "bg-amber-100 text-amber-700" },
  expired: { label: "Expirada", cls: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelada", cls: "bg-gray-200 text-gray-600" },
  trial: { label: "Trial", cls: "bg-blue-100 text-blue-700" },
};

export default function StoreSubscription() {
  const { token } = useAuth();
  const s = useAdminStyles();
  const toast = useToastNotification();
  const { slug } = useOutletContext<{ slug: string }>();

  const [plan, setPlan] = useState<CurrentPlan | null>(null);
  const [sub, setSub] = useState<CurrentSub | null>(null);
  const [usage, setUsage] = useState<{ products: number; max_products: number }>({ products: 0, max_products: 0 });
  const [plans, setPlans] = useState<AvailablePlan[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [plansOpen, setPlansOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState<AvailablePlan | null>(null);
  const [payMethods, setPayMethods] = useState<PayMethodOption[]>([]);
  const [payMethodId, setPayMethodId] = useState("");
  const [payFile, setPayFile] = useState<File | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState("");

  const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };

  const fetchCurrent = () => {
    if (!token || !slug) return;
    setLoading(true);
    fetch(`${API}/store-panel/${slug}/subscription`, { headers })
      .then((r) => r.json())
      .then((d) => { setPlan(d.plan); setSub(d.subscription); setUsage(d.usage); })
      .finally(() => setLoading(false));
  };

  const fetchPlans = () => {
    fetch(`${API}/store-panel/${slug}/subscription/plans`, { headers })
      .then((r) => r.json())
      .then((d) => setPlans(Array.isArray(d) ? d : []));
  };

  const fetchPayMethods = () => {
    fetch(`${API}/store-panel/${slug}/subscription-payment-methods`, { headers })
      .then((r) => r.json())
      .then((d) => setPayMethods(Array.isArray(d) ? d : []));
  };

  const fetchHistory = () => {
    fetch(`${API}/store-panel/${slug}/subscription/history`, { headers })
      .then((r) => r.json())
      .then((d) => setHistory(Array.isArray(d) ? d : []));
  };

  useEffect(() => { fetchCurrent(); }, [token, slug]);

  useEffect(() => {
    if (plansOpen && plans.length === 0) { fetchPlans(); fetchPayMethods(); }
  }, [plansOpen]);

  useEffect(() => {
    if (historyOpen && history.length === 0) fetchHistory();
  }, [historyOpen]);

  const requestUpgrade = async () => {
    if (!upgradeModal) return;
    setUpgrading(true);
    try {
      const fd = new FormData();
      fd.append("plan_id", String(upgradeModal.id));
      const selMethod = payMethods.find(m => m.id === parseInt(payMethodId));
      if (selMethod) fd.append("payment_method", selMethod.name);
      if (payFile) fd.append("payment_proof", payFile);
      const res = await fetch(`${API}/store-panel/${slug}/subscription/upgrade`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        body: fd,
      });
      const d = await res.json();
      if (res.ok) {
        toast.success("Pedido enviado", d.message);
        setUpgradeModal(null); setPayMethodId(""); setPayFile(null);
        fetchCurrent(); fetchHistory();
      } else {
        toast.error("Erro", d.error || "Nao foi possivel enviar pedido.");
      }
    } finally { setUpgrading(false); }
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  };

  const selectedPayMethod = payMethods.find(m => m.id === parseInt(payMethodId));

  const downgrade = async () => {
    if (!confirm("Tem a certeza que deseja voltar ao plano gratuito?")) return;
    const res = await fetch(`${API}/store-panel/${slug}/subscription/downgrade`, { method: "POST", headers });
    const d = await res.json();
    if (res.ok) { toast.success("Plano alterado", d.message); fetchCurrent(); fetchHistory(); }
    else toast.error("Erro", d.error || "Erro.");
  };

  const toggleRenew = async () => {
    setToggling(true);
    try {
      const res = await fetch(`${API}/store-panel/${slug}/subscription/toggle-renew`, { method: "POST", headers });
      const d = await res.json();
      if (res.ok) { toast.success("Actualizado", d.message); fetchCurrent(); }
      else toast.error("Erro", d.error || "Erro.");
    } finally { setToggling(false); }
  };

  const formatPrice = (p: string | number) => {
    const n = typeof p === "string" ? parseFloat(p) : p;
    if (n === 0) return "Gratis";
    return new Intl.NumberFormat("pt-AO", { minimumFractionDigits: 0 }).format(n) + " Kz";
  };
  const cycleName = (c: string) => c === "monthly" ? "/mes" : c === "yearly" ? "/ano" : "";
  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("pt-PT") : "—";

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-lg font-bold ${s.textPrimary}`}>Subscricao</h2>
        <p className={`text-xs ${s.textMuted}`}>Gerencie o seu plano e subscricao</p>
      </div>

      {/* ─── Current Plan Card ─── */}
      <div className={`rounded-2xl border ${s.card} overflow-hidden`}>
        <div className={`bg-gradient-to-r ${plan?.is_free ? PLAN_COLORS[0] : PLAN_COLORS[2]} p-6 text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <Crown className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-white/70 uppercase tracking-wider font-medium">Plano Actual</p>
                <p className="text-xl font-extrabold">{plan?.name || "Nenhum"}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold">{plan ? formatPrice(plan.price) : "—"}</p>
              {plan && !plan.is_free && <p className="text-xs text-white/70">{cycleName(plan.billing_cycle)}</p>}
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Subscription status */}
          {sub ? (
            <div className="flex flex-wrap gap-4 items-center">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${STATUS_MAP[sub.status]?.cls || "bg-gray-100"}`}>
                {STATUS_MAP[sub.status]?.label || sub.status}
              </span>
              {sub.expires_at && (
                <span className={`flex items-center gap-1 text-xs ${s.textMuted}`}>
                  <Calendar className="h-3.5 w-3.5" />
                  Expira: {fmtDate(sub.expires_at)}
                  {sub.days_remaining > 0 && sub.days_remaining <= 7 && (
                    <span className="text-amber-500 font-semibold ml-1">({sub.days_remaining} dias)</span>
                  )}
                </span>
              )}
              {sub.paid_at && (
                <span className={`flex items-center gap-1 text-xs ${s.textMuted}`}>
                  <CreditCard className="h-3.5 w-3.5" /> Pago: {fmtDate(sub.paid_at)} — {formatPrice(sub.amount_paid)}
                </span>
              )}
              {/* Auto-renew toggle */}
              {!plan?.is_free && (
                <div className="flex flex-col gap-0.5">
                  <button onClick={toggleRenew} disabled={toggling}
                    className={`flex items-center gap-1.5 text-xs font-medium ${sub.auto_renew ? "text-emerald-500" : s.textMuted} disabled:opacity-50`}>
                    {toggling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : sub.auto_renew ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                    Renovacao auto
                  </button>
                  <span className={`text-[9px] ${s.textMuted} max-w-[200px] leading-tight`}>
                    {sub.auto_renew
                      ? "Ao expirar, sera criado um pedido de renovacao. Tera que enviar novo comprovativo."
                      : "Ao expirar, o plano volta ao gratuito."}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className={`text-xs ${s.textMuted}`}>Nenhuma subscricao activa registada.</p>
          )}

          {/* Usage */}
          <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3`}>
            {[
              { label: "Produtos", value: `${usage.products}/${usage.max_products === 0 ? "∞" : usage.max_products}`, icon: Package, color: "blue" },
              { label: "Imagens/prod", value: plan?.max_images_per_product || 0, icon: Image, color: "purple" },
              { label: "Hero Slides", value: plan?.max_hero_slides || 0, icon: Sparkles, color: "cyan" },
              { label: "API", value: plan?.has_api ? "Sim" : "Nao", icon: Key, color: plan?.has_api ? "emerald" : "gray" },
            ].map((item) => (
              <div key={item.label} className={`p-3 rounded-xl border ${s.borderLight} text-center`}>
                <item.icon className={`h-4 w-4 text-${item.color}-500 mx-auto mb-1`} />
                <p className={`text-xs font-bold ${s.textPrimary}`}>{item.value}</p>
                <p className={`text-[10px] ${s.textMuted}`}>{item.label}</p>
              </div>
            ))}
          </div>

          {/* Features */}
          {plan?.features && plan.features.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {plan.features.map((f, i) => (
                <span key={i} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] ${s.isDark ? "bg-white/[0.04]" : "bg-gray-50"} ${s.textSecondary}`}>
                  <Check className="h-3 w-3 text-emerald-500" /> {f}
                </span>
              ))}
            </div>
          )}

          {/* Perk badges */}
          <div className="flex flex-wrap gap-1.5">
            {plan?.priority_support && <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium ${s.isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}><HeadphonesIcon className="h-2.5 w-2.5" /> Suporte VIP</span>}
            {plan?.featured_badge && <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium ${s.isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600"}`}><ShieldCheck className="h-2.5 w-2.5" /> Badge</span>}
            {plan?.analytics && <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium ${s.isDark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600"}`}><BarChart3 className="h-2.5 w-2.5" /> Analytics</span>}
            {plan?.custom_domain && <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium ${s.isDark ? "bg-purple-500/10 text-purple-400" : "bg-purple-50 text-purple-600"}`}><Globe className="h-2.5 w-2.5" /> Dominio</span>}
            {plan?.has_api && <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium ${s.isDark ? "bg-cyan-500/10 text-cyan-400" : "bg-cyan-50 text-cyan-600"}`}><Key className="h-2.5 w-2.5" /> API</span>}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button onClick={() => setPlansOpen(!plansOpen)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold ${s.btnPrimary} shadow-sm`}>
              <ArrowUpRight className="h-4 w-4" /> {plan?.is_free ? "Fazer Upgrade" : "Alterar Plano"}
            </button>
            {plan && !plan.is_free && (
              <button onClick={downgrade} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium ${s.btnSecondary}`}>
                Voltar ao Gratuito
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Available Plans ─── */}
      {plansOpen && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className={`text-sm font-bold ${s.textPrimary}`}>Planos Disponiveis</h3>
            <button onClick={() => setPlansOpen(false)} className={`${s.textMuted} hover:text-orange-500`}>
              <ChevronUp className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {plans.map((p, idx) => {
              const PIcon = PLAN_ICONS[idx % PLAN_ICONS.length];
              const grad = PLAN_COLORS[idx % PLAN_COLORS.length];
              return (
                <div key={p.id} className={`rounded-2xl border ${s.card} overflow-hidden transition-all ${p.is_current ? "ring-2 ring-orange-500" : ""} ${p.is_recommended ? "ring-2 ring-amber-400" : ""}`}>
                  {p.is_recommended && !p.is_current && (
                    <div className="bg-amber-400 text-center py-1 text-[9px] font-bold text-white uppercase tracking-wider">Recomendado</div>
                  )}
                  {p.is_current && (
                    <div className="bg-orange-500 text-center py-1 text-[9px] font-bold text-white uppercase tracking-wider">Plano Actual</div>
                  )}
                  <div className={`bg-gradient-to-r ${grad} p-4 text-white`}>
                    <div className="flex items-center gap-2 mb-2">
                      <PIcon className="h-5 w-5" />
                      <span className="font-bold text-sm">{p.name}</span>
                    </div>
                    <div className="flex items-end gap-1">
                      <span className="text-xl font-extrabold">{formatPrice(p.price)}</span>
                      {!p.is_free && <span className="text-white/70 text-[10px] mb-0.5">{cycleName(p.billing_cycle)}</span>}
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {p.description && <p className={`text-[10px] ${s.textMuted} leading-relaxed`}>{p.description}</p>}
                    {p.features && (
                      <ul className="space-y-1">
                        {p.features.slice(0, 4).map((f, i) => (
                          <li key={i} className={`flex items-start gap-1.5 text-[10px] ${s.textSecondary}`}>
                            <Check className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" /> {f}
                          </li>
                        ))}
                        {p.features.length > 4 && <li className={`text-[9px] ${s.textMuted} pl-4`}>+{p.features.length - 4} mais</li>}
                      </ul>
                    )}
                    {!p.is_current && !p.is_free && (
                      <button onClick={() => { setUpgradeModal(p); setPayMethodId(""); setPayFile(null); if (payMethods.length === 0) fetchPayMethods(); }}
                        className={`w-full py-2 rounded-xl text-xs font-semibold ${s.btnPrimary} shadow-sm`}>
                        Subscrever
                      </button>
                    )}
                    {p.is_current && (
                      <div className={`w-full py-2 rounded-xl text-xs font-semibold text-center ${s.isDark ? "bg-white/[0.05] text-white/50" : "bg-gray-100 text-gray-400"}`}>
                        Plano Actual
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── History ─── */}
      <div className={`rounded-2xl border ${s.card} overflow-hidden`}>
        <button onClick={() => setHistoryOpen(!historyOpen)}
          className={`w-full flex items-center justify-between p-4 ${s.textPrimary} hover:opacity-80 transition-opacity`}>
          <span className="flex items-center gap-2 text-sm font-bold">
            <History className="h-4 w-4 text-orange-500" /> Historico de Subscricoes
          </span>
          {historyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {historyOpen && (
          <div className={`border-t ${s.borderLight}`}>
            {history.length === 0 ? (
              <p className={`p-4 text-xs ${s.textMuted} text-center`}>Nenhum historico.</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                {history.map((h) => (
                  <div key={h.id} className="px-4 py-3 flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${STATUS_MAP[h.status]?.cls || "bg-gray-100"}`}>
                      {STATUS_MAP[h.status]?.label || h.status}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${s.textPrimary}`}>{h.plan.name}</p>
                      <p className={`text-[10px] ${s.textMuted}`}>
                        {fmtDate(h.starts_at)} → {h.expires_at ? fmtDate(h.expires_at) : "Sem expiracao"}
                        {h.payment_method && ` • ${h.payment_method}`}
                      </p>
                    </div>
                    <span className={`text-xs font-bold ${s.textPrimary}`}>{formatPrice(h.amount_paid)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Upgrade Modal ─── */}
      <Modal open={!!upgradeModal} onClose={() => setUpgradeModal(null)} title={`Subscrever — ${upgradeModal?.name}`} size="md">
        {upgradeModal && (
          <div className="space-y-4">
            <div className={`rounded-xl p-4 ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"} space-y-2`}>
              <div className="flex justify-between">
                <span className={`text-xs ${s.textMuted}`}>Plano</span>
                <span className={`text-xs font-bold ${s.textPrimary}`}>{upgradeModal.name}</span>
              </div>
              <div className="flex justify-between">
                <span className={`text-xs ${s.textMuted}`}>Valor</span>
                <span className={`text-sm font-extrabold ${s.textPrimary}`}>{formatPrice(upgradeModal.price)}{cycleName(upgradeModal.billing_cycle)}</span>
              </div>
            </div>

            <div>
              <label className={`text-[10px] font-medium ${s.textMuted} uppercase tracking-wider mb-1.5 block`}>Metodo de Pagamento</label>
              {payMethods.length === 0 ? (
                <p className={`text-xs ${s.textMuted} italic py-2`}>Nenhum metodo de pagamento configurado pelo administrador.</p>
              ) : (
                <select value={payMethodId} onChange={(e) => setPayMethodId(e.target.value)}
                  className={`w-full ${s.input} border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20`}>
                  <option value="">Seleccionar...</option>
                  {payMethods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              )}
            </div>

            {/* Payment method details (IBAN, phone, etc) */}
            {selectedPayMethod && (
              <div className={`rounded-xl p-3 border ${s.isDark ? "border-blue-500/20 bg-blue-900/10" : "border-blue-200 bg-blue-50"} space-y-2`}>
                <p className={`text-[10px] font-bold ${s.isDark ? "text-blue-300" : "text-blue-700"} uppercase tracking-wider`}>Dados para Pagamento</p>
                <div className={`text-xs ${s.isDark ? "text-blue-200" : "text-blue-800"} space-y-1.5`}>
                  {selectedPayMethod.bank_name && (
                    <div className="flex items-center justify-between">
                      <span><strong>Banco:</strong> {selectedPayMethod.bank_name}</span>
                    </div>
                  )}
                  {selectedPayMethod.iban && (
                    <div className="flex items-center justify-between gap-2">
                      <span><strong>IBAN:</strong> <span className="font-mono text-[11px]">{selectedPayMethod.iban}</span></span>
                      <button onClick={() => copyText(selectedPayMethod.iban!, "iban")}
                        className={`shrink-0 p-1 rounded transition-colors ${copied === "iban" ? "text-emerald-500" : "hover:text-orange-500"}`}>
                        {copied === "iban" ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  )}
                  {selectedPayMethod.account_number && (
                    <div className="flex items-center justify-between gap-2">
                      <span><strong>N. Conta:</strong> {selectedPayMethod.account_number}</span>
                      <button onClick={() => copyText(selectedPayMethod.account_number!, "account")}
                        className={`shrink-0 p-1 rounded transition-colors ${copied === "account" ? "text-emerald-500" : "hover:text-orange-500"}`}>
                        {copied === "account" ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  )}
                  {selectedPayMethod.account_holder && <p><strong>Titular:</strong> {selectedPayMethod.account_holder}</p>}
                  {selectedPayMethod.phone_number && (
                    <div className="flex items-center justify-between gap-2">
                      <span><strong>Telefone:</strong> {selectedPayMethod.phone_number}</span>
                      <button onClick={() => copyText(selectedPayMethod.phone_number!, "phone")}
                        className={`shrink-0 p-1 rounded transition-colors ${copied === "phone" ? "text-emerald-500" : "hover:text-orange-500"}`}>
                        {copied === "phone" ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  )}
                  {selectedPayMethod.instructions && <p className="italic text-[10px] opacity-80 mt-1">{selectedPayMethod.instructions}</p>}
                </div>
              </div>
            )}

            {/* File upload for payment proof */}
            <div>
              <label className={`text-[10px] font-medium ${s.textMuted} uppercase tracking-wider mb-1.5 block`}>Comprovativo de Pagamento</label>
              <label className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-xl p-4 cursor-pointer transition-colors ${
                payFile
                  ? s.isDark ? "border-emerald-500/30 bg-emerald-900/10" : "border-emerald-300 bg-emerald-50"
                  : s.isDark ? "border-white/10 hover:border-orange-500/30" : "border-gray-200 hover:border-orange-300"
              }`}>
                {payFile ? (
                  <div className="flex items-center gap-2">
                    <FileImage className="h-5 w-5 text-emerald-500" />
                    <div>
                      <p className={`text-xs font-medium ${s.textPrimary}`}>{payFile.name}</p>
                      <p className={`text-[10px] ${s.textMuted}`}>{(payFile.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button type="button" onClick={(e) => { e.preventDefault(); setPayFile(null); }}
                      className="p-1 rounded-full hover:bg-red-50 text-red-400 hover:text-red-500">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className={`h-6 w-6 mb-1 ${s.textMuted}`} />
                    <p className={`text-xs ${s.textMuted}`}>Clique para anexar comprovativo</p>
                    <p className={`text-[9px] ${s.textMuted}`}>JPG, PNG, WEBP ou PDF (max 5MB)</p>
                  </>
                )}
                <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => { if (e.target.files?.[0]) setPayFile(e.target.files[0]); }} />
              </label>
            </div>

            <div className={`rounded-xl p-3 border ${s.isDark ? "border-amber-500/20 bg-amber-900/10" : "border-amber-200 bg-amber-50"}`}>
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                <p className={`text-[10px] leading-relaxed ${s.isDark ? "text-amber-300" : "text-amber-700"}`}>
                  Apos enviar o pedido, o administrador ira verificar o pagamento e activar a sua subscricao. Recebera uma notificacao quando for aprovado.
                </p>
              </div>
            </div>

            <div className={`flex justify-end gap-2 pt-2 border-t ${s.borderLight}`}>
              <button onClick={() => setUpgradeModal(null)} className={`px-4 py-2.5 rounded-xl text-xs font-medium ${s.btnSecondary}`}>Cancelar</button>
              <button onClick={requestUpgrade} disabled={upgrading}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold ${s.btnPrimary} disabled:opacity-50 shadow-sm`}>
                {upgrading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                Enviar Pedido de Subscricao
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
