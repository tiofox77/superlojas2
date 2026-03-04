import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import Modal from "@/components/admin/Modal";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CreditCard, Plus, Edit3, Trash2, Loader2, Crown, Star, Check, X,
  Package, Image, Sparkles, Globe, HeadphonesIcon, BarChart3, ShieldCheck,
  Store, ToggleLeft, ToggleRight, Users
} from "lucide-react";
import { useToastNotification } from "@/contexts/ToastContext";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

interface PlanItem {
  id: number;
  name: string;
  slug: string;
  price: string;
  billing_cycle: string;
  description: string;
  features: string[];
  max_products: number;
  max_images_per_product: number;
  max_hero_slides: number;
  max_categories: number;
  priority_support: boolean;
  featured_badge: boolean;
  analytics: boolean;
  custom_domain: boolean;
  has_api: boolean;
  has_pos: boolean;
  is_free: boolean;
  is_active: boolean;
  is_recommended: boolean;
  sort_order: number;
  stores_count: number;
}

const emptyForm = {
  name: "", price: "0", billing_cycle: "monthly", description: "",
  features: [] as string[], max_products: "10", max_images_per_product: "5",
  max_hero_slides: "0", max_categories: "1", priority_support: false, featured_badge: false,
  analytics: false, custom_domain: false, has_api: false, has_pos: false, is_free: false,
  is_active: true, is_recommended: false, sort_order: "0",
};

const PLAN_COLORS = [
  "from-gray-500 to-gray-600",
  "from-blue-500 to-blue-600",
  "from-orange-500 to-pink-500",
  "from-purple-500 to-indigo-600",
  "from-amber-500 to-red-500",
];

const PLAN_ICONS = [CreditCard, Star, Crown, Sparkles, Globe];

export default function AdminPlans() {
  const { token } = useAuth();
  const s = useAdminStyles();
  const toast = useToastNotification();
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<PlanItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [newFeature, setNewFeature] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchPlans = () => {
    if (!token) return;
    setLoading(true);
    fetch(`${API}/admin/plans`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } })
      .then((r) => r.json())
      .then((data) => setPlans(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPlans(); }, [token]);

  const openCreate = () => {
    setEditPlan(null);
    setForm({ ...emptyForm, sort_order: String(plans.length + 1) });
    setNewFeature(""); setFormError(""); setModalOpen(true);
  };

  const openEdit = (p: PlanItem) => {
    setEditPlan(p);
    setForm({
      name: p.name, price: String(p.price), billing_cycle: p.billing_cycle,
      description: p.description || "", features: p.features || [],
      max_products: String(p.max_products), max_images_per_product: String(p.max_images_per_product),
      max_hero_slides: String(p.max_hero_slides), max_categories: String(p.max_categories ?? 1), priority_support: p.priority_support,
      featured_badge: p.featured_badge, analytics: p.analytics, custom_domain: p.custom_domain,
      has_api: p.has_api, has_pos: p.has_pos, is_free: p.is_free, is_active: p.is_active, is_recommended: p.is_recommended,
      sort_order: String(p.sort_order),
    });
    setNewFeature(""); setFormError(""); setModalOpen(true);
  };

  const savePlan = async () => {
    if (!form.name) { setFormError("Nome e obrigatorio."); return; }
    setSaving(true); setFormError("");

    const body = {
      name: form.name,
      price: form.is_free ? 0 : parseFloat(form.price) || 0,
      billing_cycle: form.billing_cycle,
      description: form.description,
      features: form.features,
      max_products: parseInt(form.max_products) || 0,
      max_images_per_product: parseInt(form.max_images_per_product) || 5,
      max_hero_slides: parseInt(form.max_hero_slides) || 0,
      max_categories: parseInt(form.max_categories) || 1,
      priority_support: form.priority_support,
      featured_badge: form.featured_badge,
      analytics: form.analytics,
      custom_domain: form.custom_domain,
      has_api: form.has_api,
      has_pos: form.has_pos,
      is_free: form.is_free,
      is_active: form.is_active,
      is_recommended: form.is_recommended,
      sort_order: parseInt(form.sort_order) || 0,
    };

    const url = editPlan ? `${API}/admin/plans/${editPlan.id}` : `${API}/admin/plans`;
    try {
      const res = await fetch(url, {
        method: editPlan ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.errors ? Object.values(data.errors).flat().join(", ") : data.message || "Erro");
        toast.error("Erro", "Nao foi possivel guardar o plano.");
      } else {
        setModalOpen(false); fetchPlans();
        toast.success(editPlan ? "Plano actualizado" : "Plano criado", `"${form.name}" guardado.`);
      }
    } finally { setSaving(false); }
  };

  const deletePlan = async (id: number) => {
    if (!confirm("Eliminar este plano?")) return;
    setActionLoading(id);
    try {
      const res = await fetch(`${API}/admin/plans/${id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const data = await res.json();
      if (res.ok) { fetchPlans(); toast.success("Plano eliminado"); }
      else toast.error("Erro", data.message || "Nao foi possivel eliminar.");
    } finally { setActionLoading(null); }
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setForm({ ...form, features: [...form.features, newFeature.trim()] });
      setNewFeature("");
    }
  };

  const removeFeature = (i: number) => {
    setForm({ ...form, features: form.features.filter((_, j) => j !== i) });
  };

  const inputCls = `w-full ${s.input} border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20`;
  const labelCls = `block text-xs font-medium ${s.textSecondary} mb-1.5`;

  const Toggle = ({ val, onChange, label }: { val: boolean; onChange: (v: boolean) => void; label: string }) => (
    <button type="button" onClick={() => onChange(!val)} className={`flex items-center gap-2 text-xs font-medium ${val ? "text-emerald-500" : s.textMuted}`}>
      {val ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />} {label}
    </button>
  );

  const formatPrice = (price: string | number) => {
    const n = typeof price === "string" ? parseFloat(price) : price;
    if (n === 0) return "Gratis";
    return new Intl.NumberFormat("pt-AO", { style: "decimal", minimumFractionDigits: 0 }).format(n) + " Kz";
  };

  const cycleName = (c: string) => c === "monthly" ? "/mes" : c === "yearly" ? "/ano" : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-bold ${s.textPrimary}`}>Planos e Pacotes</h2>
          <p className={`text-xs ${s.textMuted}`}>{plans.length} planos configurados</p>
        </div>
        <button onClick={openCreate} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${s.btnPrimary} text-xs font-semibold shadow-sm`}>
          <Plus className="h-4 w-4" /> Novo Plano
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className={`rounded-2xl border ${s.card} h-72 animate-pulse`} />)}
        </div>
      ) : plans.length === 0 ? (
        <div className={`rounded-2xl border ${s.card} py-16 text-center`}>
          <CreditCard className={`h-12 w-12 ${s.empty} mx-auto mb-3`} />
          <p className={`text-sm ${s.textMuted}`}>Nenhum plano configurado</p>
          <button onClick={openCreate} className={`mt-3 px-4 py-2 rounded-xl text-xs font-semibold ${s.btnPrimary}`}>Criar primeiro plano</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan, idx) => {
            const PlanIcon = PLAN_ICONS[idx % PLAN_ICONS.length];
            const gradient = PLAN_COLORS[idx % PLAN_COLORS.length];
            return (
              <motion.div key={plan.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border ${s.card} overflow-hidden transition-all group relative ${!plan.is_active ? "opacity-60" : ""}`}>

                {plan.is_recommended && (
                  <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full bg-orange-500 text-white text-[9px] font-bold uppercase tracking-wider shadow-lg">
                    Recomendado
                  </div>
                )}

                {/* Header gradient */}
                <div className={`bg-gradient-to-r ${gradient} p-5 text-white`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                      <PlanIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{plan.name}</p>
                      {!plan.is_active && <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded-full">Inactivo</span>}
                    </div>
                  </div>
                  <div className="flex items-end gap-1">
                    <span className="text-2xl font-extrabold">{formatPrice(plan.price)}</span>
                    {!plan.is_free && <span className="text-white/70 text-xs mb-1">{cycleName(plan.billing_cycle)}</span>}
                  </div>
                </div>

                {/* Features */}
                <div className="p-5 space-y-3">
                  {plan.description && <p className={`text-[11px] ${s.textMuted} leading-relaxed`}>{plan.description}</p>}

                  {/* Limits badges */}
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${s.badge("blue")}`}>
                      <Package className="h-2.5 w-2.5" /> {plan.max_products === 0 ? "Ilimitado" : plan.max_products} prod.
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${s.badge("purple")}`}>
                      <Image className="h-2.5 w-2.5" /> {plan.max_images_per_product} img
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${s.badge("orange")}`}>
                      {plan.max_categories === 0 ? "∞" : plan.max_categories} categ.
                    </span>
                    {plan.max_hero_slides > 0 && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${s.badge("orange")}`}>
                        {plan.max_hero_slides} slides
                      </span>
                    )}
                  </div>

                  {/* Feature checkmarks */}
                  {plan.features && plan.features.length > 0 && (
                    <ul className="space-y-1.5">
                      {plan.features.slice(0, 5).map((f, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span className={`text-[11px] ${s.textSecondary}`}>{f}</span>
                        </li>
                      ))}
                      {plan.features.length > 5 && (
                        <li className={`text-[10px] ${s.textMuted} pl-5`}>+{plan.features.length - 5} mais...</li>
                      )}
                    </ul>
                  )}

                  {/* Boolean perks */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {plan.priority_support && <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] ${s.isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}><HeadphonesIcon className="h-2.5 w-2.5" /> Suporte</span>}
                    {plan.featured_badge && <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] ${s.isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600"}`}><ShieldCheck className="h-2.5 w-2.5" /> Badge</span>}
                    {plan.analytics && <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] ${s.isDark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600"}`}><BarChart3 className="h-2.5 w-2.5" /> Analytics</span>}
                    {plan.custom_domain && <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] ${s.isDark ? "bg-purple-500/10 text-purple-400" : "bg-purple-50 text-purple-600"}`}><Globe className="h-2.5 w-2.5" /> Dominio</span>}
                    {plan.has_api && <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] ${s.isDark ? "bg-cyan-500/10 text-cyan-400" : "bg-cyan-50 text-cyan-600"}`}><Package className="h-2.5 w-2.5" /> API</span>}
                    {plan.has_pos && <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] ${s.isDark ? "bg-teal-500/10 text-teal-400" : "bg-teal-50 text-teal-600"}`}><Package className="h-2.5 w-2.5" /> POS</span>}
                  </div>
                </div>

                {/* Footer */}
                <div className={`px-5 py-3 border-t ${s.borderLight} flex items-center justify-between`}>
                  <span className={`inline-flex items-center gap-1 text-[10px] ${s.textMuted}`}>
                    <Users className="h-3 w-3" /> {plan.stores_count || 0} lojas
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(plan)} className={`p-1.5 rounded-lg ${s.textMuted} hover:text-orange-500 transition-colors`}>
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => deletePlan(plan.id)} disabled={actionLoading === plan.id}
                      className={`p-1.5 rounded-lg ${s.textMuted} hover:text-red-500 transition-colors disabled:opacity-50`}>
                      {actionLoading === plan.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ─── CREATE / EDIT MODAL ─── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editPlan ? "Editar Plano" : "Novo Plano"} size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {formError && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">{formError}</div>}

          {/* Basic info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nome do Plano <span className="text-red-500">*</span></label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Profissional" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Ciclo</label>
              <select value={form.billing_cycle} onChange={(e) => setForm({ ...form, billing_cycle: e.target.value })} className={inputCls}>
                <option value="monthly">Mensal</option>
                <option value="yearly">Anual</option>
                <option value="one_time">Unico</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Preco (Kz)</label>
              <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                disabled={form.is_free} placeholder="0" className={`${inputCls} disabled:opacity-50`} />
            </div>
            <div>
              <label className={labelCls}>Ordem</label>
              <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} placeholder="1" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Descricao</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
                placeholder="Descricao breve do plano..." className={`${inputCls} resize-none`} />
            </div>
          </div>

          {/* Toggles */}
          <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl border ${s.borderLight}`}>
            <Toggle val={form.is_free} onChange={(v) => setForm({ ...form, is_free: v, price: v ? "0" : form.price })} label="Gratuito" />
            <Toggle val={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} label="Activo" />
            <Toggle val={form.is_recommended} onChange={(v) => setForm({ ...form, is_recommended: v })} label="Recomendado" />
            <Toggle val={form.priority_support} onChange={(v) => setForm({ ...form, priority_support: v })} label="Suporte VIP" />
            <Toggle val={form.featured_badge} onChange={(v) => setForm({ ...form, featured_badge: v })} label="Badge" />
            <Toggle val={form.analytics} onChange={(v) => setForm({ ...form, analytics: v })} label="Analytics" />
            <Toggle val={form.custom_domain} onChange={(v) => setForm({ ...form, custom_domain: v })} label="Dominio" />
            <Toggle val={form.has_api} onChange={(v) => setForm({ ...form, has_api: v })} label="API Acesso" />
            <Toggle val={form.has_pos} onChange={(v) => setForm({ ...form, has_pos: v })} label="POS Offline" />
          </div>

          {/* Limits */}
          <div className={`p-4 rounded-xl border ${s.borderLight} space-y-3`}>
            <p className={`text-xs font-semibold ${s.textPrimary}`}>Limites</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={`text-[10px] ${s.textMuted} mb-1 block`}>Max Produtos</label>
                <input type="number" value={form.max_products} onChange={(e) => setForm({ ...form, max_products: e.target.value })}
                  placeholder="0 = ilimitado" className={`${s.input} border rounded-lg px-2 py-1.5 text-xs w-full focus:outline-none focus:ring-2 focus:ring-orange-500/20`} />
                <p className={`text-[9px] ${s.textMuted} mt-0.5`}>0 = ilimitado</p>
              </div>
              <div>
                <label className={`text-[10px] ${s.textMuted} mb-1 block`}>Max Imagens</label>
                <input type="number" value={form.max_images_per_product} onChange={(e) => setForm({ ...form, max_images_per_product: e.target.value })}
                  className={`${s.input} border rounded-lg px-2 py-1.5 text-xs w-full focus:outline-none focus:ring-2 focus:ring-orange-500/20`} />
              </div>
              <div>
                <label className={`text-[10px] ${s.textMuted} mb-1 block`}>Max Slides</label>
                <input type="number" value={form.max_hero_slides} onChange={(e) => setForm({ ...form, max_hero_slides: e.target.value })}
                  className={`${s.input} border rounded-lg px-2 py-1.5 text-xs w-full focus:outline-none focus:ring-2 focus:ring-orange-500/20`} />
              </div>
              <div>
                <label className={`text-[10px] ${s.textMuted} mb-1 block`}>Max Categorias</label>
                <input type="number" value={form.max_categories} onChange={(e) => setForm({ ...form, max_categories: e.target.value })}
                  className={`${s.input} border rounded-lg px-2 py-1.5 text-xs w-full focus:outline-none focus:ring-2 focus:ring-orange-500/20`} />
                <p className={`text-[9px] ${s.textMuted} mt-0.5`}>0 = ilimitado, 1 = basico</p>
              </div>
            </div>
          </div>

          {/* Features list */}
          <div className={`p-4 rounded-xl border ${s.borderLight} space-y-3`}>
            <p className={`text-xs font-semibold ${s.textPrimary}`}>Funcionalidades ({form.features.length})</p>
            <div className="space-y-1.5">
              {form.features.map((f, i) => (
                <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}>
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className={`text-xs flex-1 ${s.textPrimary}`}>{f}</span>
                  <button onClick={() => removeFeature(i)} className={`${s.textMuted} hover:text-red-500 transition-colors`}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newFeature} onChange={(e) => setNewFeature(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFeature(); } }}
                placeholder="Nova funcionalidade... (Enter)" className={inputCls} />
              <button onClick={addFeature} className={`px-3 py-2.5 rounded-xl ${s.btnPrimary} text-xs font-semibold shrink-0`}>
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className={`flex justify-end gap-2 pt-2 border-t ${s.borderLight}`}>
            <button onClick={() => setModalOpen(false)} className={`px-4 py-2.5 rounded-xl text-xs font-medium ${s.btnSecondary}`}>Cancelar</button>
            <button onClick={savePlan} disabled={saving} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold ${s.btnPrimary} disabled:opacity-50 shadow-sm`}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} {editPlan ? "Guardar" : "Criar Plano"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
