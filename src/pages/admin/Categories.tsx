import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import Modal from "@/components/admin/Modal";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Tag, Plus, Trash2, Edit3, Loader2, Search, ChevronDown, ChevronRight, FolderTree } from "lucide-react";
import { useToastNotification } from "@/contexts/ToastContext";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

interface SubcategoryItem { id: number; category_id: number; name: string; slug: string; product_count: number; }
interface CategoryItem { id: number; name: string; slug: string; icon: string; product_count: number; subcategories?: SubcategoryItem[]; }
const emptyForm = { name: "", slug: "", icon: "" };
const emptySubForm = { name: "", slug: "" };
type LoadingAction = { id: number; action: string } | null;

const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  { label: "Compras", emojis: ["🛒","🛍️","🏪","🏬","💳","🏷️","📦","🎁","💰","💵","🪙","🧾"] },
  { label: "Tecnologia", emojis: ["📱","💻","🖥️","⌨️","🖨️","🔌","💡","🔋","📷","🎮","🕹️","🎧","📡","📺","🖱️","💾"] },
  { label: "Moda", emojis: ["👗","👕","👖","👟","👠","👜","🧥","🧣","🧢","👒","💍","⌚","🕶️","👔","👙","🧤"] },
  { label: "Casa", emojis: ["🏠","🛋️","🛏️","🪑","🚿","🧹","🧺","🕯️","🪴","🏡","🔑","🪟","🚪","🧊","🪣","🧴"] },
  { label: "Alimentacao", emojis: ["🍎","🍕","🍔","🥗","🍰","🍩","☕","🥤","🍷","🥘","🍣","🌽","🥦","🍗","🧁","🍺"] },
  { label: "Desporto", emojis: ["⚽","🏀","🏈","🎾","🏐","🏓","🥊","🏋️","🚴","🏊","⛳","🎯","🧘","🏄","🎿","🏇"] },
  { label: "Beleza", emojis: ["💄","💅","🧴","🪮","💇","🧖","🌸","🌺","🧼","🪥","💆","🩺","💊","🏥","❤️","✨"] },
  { label: "Automoveis", emojis: ["🚗","🚕","🏍️","🚲","🛵","🚌","✈️","🚀","⛽","🔧","🛞","🚜","🚛","🏎️","🛻","⛵"] },
  { label: "Educacao", emojis: ["📚","📖","✏️","🎓","📝","🔬","🧪","🌍","📐","🖊️","🗂️","📌","🎨","🎭","🎵","🎬"] },
  { label: "Animais", emojis: ["🐶","🐱","🐟","🐦","🐰","🐎","🐢","🦜","🐹","🦴","🐾","🪺","🌿","🌲","🌻","🌈"] },
  { label: "Outros", emojis: ["⭐","🔥","💎","🎉","🏆","👑","🌟","💫","🎊","🧩","♻️","🌐","📢","🔔","❗","✅"] },
];

export default function AdminCategories() {
  const { token } = useAuth();
  const s = useAdminStyles();
  const toast = useToastNotification();
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editCat, setEditCat] = useState<CategoryItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [actionLoading, setActionLoading] = useState<LoadingAction>(null);
  const [emojiSearch, setEmojiSearch] = useState("");
  const [emojiTab, setEmojiTab] = useState(0);

  // Subcategory state
  const [expandedCat, setExpandedCat] = useState<number | null>(null);
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [subModalCatId, setSubModalCatId] = useState<number | null>(null);
  const [editSub, setEditSub] = useState<SubcategoryItem | null>(null);
  const [subForm, setSubForm] = useState(emptySubForm);
  const [savingSub, setSavingSub] = useState(false);
  const [subFormError, setSubFormError] = useState("");

  const fetchCategories = () => {
    if (!token) return;
    setLoading(true);
    fetch(`${API}/admin/categories`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } })
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCategories(); }, [token]);

  const openCreate = () => { setEditCat(null); setForm(emptyForm); setEmojiSearch(""); setEmojiTab(0); setFormError(""); setModalOpen(true); };
  const openEdit = (cat: CategoryItem) => {
    setEditCat(cat); setForm({ name: cat.name, slug: cat.slug, icon: cat.icon }); setEmojiSearch(""); setEmojiTab(0); setFormError(""); setModalOpen(true);
  };

  const filteredEmojis = emojiSearch
    ? EMOJI_GROUPS.flatMap((g) => g.emojis).filter((_, i, arr) => {
        // Deduplicate
        return arr.indexOf(arr[i]) === i;
      })
    : EMOJI_GROUPS[emojiTab]?.emojis || [];

  const saveCat = async () => {
    if (!form.name || !form.slug || !form.icon) { setFormError("Todos os campos sao obrigatorios."); return; }
    setSaving(true); setFormError("");
    const url = editCat ? `${API}/admin/categories/${editCat.id}` : `${API}/admin/categories`;
    try {
      const res = await fetch(url, { method: editCat ? "PUT" : "POST", headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setFormError(data.errors ? (Object.values(data.errors).flat().join(", ") as string) : data.message || "Erro"); toast.error("Erro", "Nao foi possivel guardar a categoria."); }
      else { setModalOpen(false); fetchCategories(); toast.success(editCat ? "Categoria actualizada" : "Categoria criada", `"${form.name}" guardada com sucesso.`); }
    } finally { setSaving(false); }
  };

  const deleteCat = async (id: number, name: string) => {
    if (!confirm(`Eliminar "${name}" e todas as subcategorias?`)) return;
    setActionLoading({ id, action: "delete" });
    const res = await fetch(`${API}/admin/categories/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    setActionLoading(null); fetchCategories();
    if (res.ok) toast.success("Categoria eliminada", `"${name}" foi removida.`);
    else toast.error("Erro", "Nao foi possivel eliminar a categoria.");
  };

  // ── Subcategory CRUD ──
  const openCreateSub = (catId: number) => { setEditSub(null); setSubForm(emptySubForm); setSubFormError(""); setSubModalCatId(catId); setSubModalOpen(true); };
  const openEditSub = (sub: SubcategoryItem) => { setEditSub(sub); setSubForm({ name: sub.name, slug: sub.slug }); setSubFormError(""); setSubModalCatId(sub.category_id); setSubModalOpen(true); };

  const saveSub = async () => {
    if (!subForm.name || !subForm.slug) { setSubFormError("Nome e slug sao obrigatorios."); return; }
    setSavingSub(true); setSubFormError("");
    const url = editSub ? `${API}/admin/subcategories/${editSub.id}` : `${API}/admin/subcategories`;
    const body = editSub ? { name: subForm.name, slug: subForm.slug } : { category_id: subModalCatId, name: subForm.name, slug: subForm.slug };
    try {
      const res = await fetch(url, { method: editSub ? "PUT" : "POST", headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setSubFormError(data.message || "Erro"); }
      else { setSubModalOpen(false); fetchCategories(); toast.success(editSub ? "Subcategoria actualizada" : "Subcategoria criada"); }
    } finally { setSavingSub(false); }
  };

  const deleteSub = async (sub: SubcategoryItem) => {
    if (!confirm(`Eliminar subcategoria "${sub.name}"?`)) return;
    setActionLoading({ id: sub.id, action: "deleteSub" });
    const res = await fetch(`${API}/admin/subcategories/${sub.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    setActionLoading(null); fetchCategories();
    if (res.ok) toast.success("Subcategoria eliminada");
    else toast.error("Erro", "Nao foi possivel eliminar.");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-bold ${s.textPrimary}`}>Gestao de Categorias</h2>
          <p className={`text-xs ${s.textMuted}`}>{categories.length} categorias</p>
        </div>
        <button onClick={openCreate} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${s.btnPrimary} text-xs font-semibold shadow-sm`}>
          <Plus className="h-4 w-4" /> Nova Categoria
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`rounded-2xl border ${s.card} p-5 animate-pulse`}>
              <div className={`h-8 w-8 ${s.skeleton} rounded mb-3`} />
              <div className={`h-4 w-24 ${s.skeleton} rounded`} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map((cat) => {
            const isExpanded = expandedCat === cat.id;
            const subs = cat.subcategories || [];
            return (
              <motion.div key={cat.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className={`rounded-2xl border ${s.card} ${s.cardHover} transition-all group`}>
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{cat.icon}</span>
                      <div>
                        <p className={`text-sm font-semibold ${s.textPrimary}`}>{cat.name}</p>
                        <p className={`text-[10px] ${s.textMuted}`}>/{cat.slug} — {cat.product_count} produtos — {subs.length} subcategorias</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(cat)} className={`p-1.5 rounded-lg ${s.textMuted} hover:text-orange-500 transition-colors`}><Edit3 className="h-3.5 w-3.5" /></button>
                      <button onClick={() => deleteCat(cat.id, cat.name)} disabled={actionLoading?.id === cat.id && actionLoading?.action === "delete"} className={`p-1.5 rounded-lg ${s.textMuted} hover:text-red-500 transition-colors disabled:opacity-50`}>
                        {actionLoading?.id === cat.id && actionLoading?.action === "delete" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  {/* Expand/collapse toggle */}
                  <button onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                    className={`flex items-center gap-1.5 mt-3 text-[11px] font-medium ${s.textMuted} hover:${s.textSecondary} transition-colors`}>
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    <FolderTree className="h-3 w-3" /> {subs.length} subcategorias
                  </button>
                </div>
                {/* Subcategories list */}
                {isExpanded && (
                  <div className={`border-t ${s.borderLight} px-5 pb-4 pt-3 space-y-2`}>
                    {subs.length === 0 && <p className={`text-[11px] ${s.textMuted}`}>Nenhuma subcategoria criada.</p>}
                    {subs.map((sub) => (
                      <div key={sub.id} className={`flex items-center justify-between px-3 py-2 rounded-xl ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"} group/sub`}>
                        <div>
                          <p className={`text-xs font-medium ${s.textPrimary}`}>{sub.name}</p>
                          <p className={`text-[10px] ${s.textMuted}`}>/{sub.slug} — {sub.product_count} produtos</p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                          <button onClick={() => openEditSub(sub)} className={`p-1 rounded-lg ${s.textMuted} hover:text-orange-500 transition-colors`}><Edit3 className="h-3 w-3" /></button>
                          <button onClick={() => deleteSub(sub)} disabled={actionLoading?.id === sub.id && actionLoading?.action === "deleteSub"} className={`p-1 rounded-lg ${s.textMuted} hover:text-red-500 transition-colors disabled:opacity-50`}>
                            {actionLoading?.id === sub.id && actionLoading?.action === "deleteSub" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                          </button>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => openCreateSub(cat.id)}
                      className={`flex items-center gap-1.5 w-full justify-center px-3 py-2 rounded-xl border border-dashed ${s.borderLight} text-[11px] font-medium ${s.textMuted} hover:text-orange-500 hover:border-orange-300 transition-colors`}>
                      <Plus className="h-3 w-3" /> Adicionar Subcategoria
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editCat ? "Editar Categoria" : "Nova Categoria"} size="md">
        <div className="space-y-4">
          {formError && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">{formError}</div>}

          {/* Emoji Picker */}
          <div>
            <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Icone <span className="text-red-500">*</span></label>
            {/* Selected emoji preview */}
            <div className="flex items-center gap-3 mb-3">
              <div className={`h-14 w-14 rounded-xl border-2 ${form.icon ? "border-orange-300 bg-orange-50" : s.isDark ? "border-white/10 bg-white/[0.02]" : "border-gray-200 bg-gray-50"} flex items-center justify-center text-3xl transition-all`}>
                {form.icon || <span className={`text-sm ${s.textMuted}`}>?</span>}
              </div>
              {form.icon && <span className={`text-xs ${s.textSecondary}`}>Seleccionado: {form.icon}</span>}
            </div>

            {/* Emoji group tabs */}
            <div className="flex gap-1 overflow-x-auto pb-2 mb-2 scrollbar-hide">
              {EMOJI_GROUPS.map((g, i) => (
                <button key={g.label} onClick={() => { setEmojiTab(i); setEmojiSearch(""); }}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all ${
                    emojiTab === i && !emojiSearch ? "bg-orange-500 text-white shadow-sm" : s.btnSecondary
                  }`}>{g.emojis[0]} {g.label}</button>
              ))}
            </div>

            {/* Emoji grid */}
            <div className={`rounded-xl border ${s.isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-gray-200 bg-gray-50/50"} p-2 max-h-[180px] overflow-y-auto`}>
              <div className="grid grid-cols-8 gap-0.5">
                {(emojiSearch
                  ? EMOJI_GROUPS.flatMap((g) => g.emojis).filter((e, i, a) => a.indexOf(e) === i)
                  : EMOJI_GROUPS[emojiTab]?.emojis || []
                ).map((emoji) => (
                  <button key={emoji} onClick={() => setForm({ ...form, icon: emoji })} type="button"
                    className={`h-9 w-full rounded-lg text-xl flex items-center justify-center transition-all ${
                      form.icon === emoji
                        ? "bg-orange-100 ring-2 ring-orange-400 scale-110"
                        : s.isDark ? "hover:bg-white/10" : "hover:bg-white hover:shadow-sm"
                    }`}>{emoji}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Name + Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Nome <span className="text-red-500">*</span></label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Electronica"
                className={`w-full ${s.input} border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20`} />
            </div>
            <div>
              <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Slug <span className="text-red-500">*</span></label>
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="electronica"
                className={`w-full ${s.input} border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20`} />
            </div>
          </div>

          <div className={`flex justify-end gap-2 pt-2 border-t ${s.borderLight}`}>
            <button onClick={() => setModalOpen(false)} className={`px-4 py-2.5 rounded-xl text-xs font-medium ${s.btnSecondary}`}>Cancelar</button>
            <button onClick={saveCat} disabled={saving} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold ${s.btnPrimary} disabled:opacity-50 shadow-sm`}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} {editCat ? "Guardar" : "Criar"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Subcategory Modal */}
      <Modal open={subModalOpen} onClose={() => setSubModalOpen(false)} title={editSub ? "Editar Subcategoria" : "Nova Subcategoria"} size="sm">
        <div className="space-y-4">
          {subFormError && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">{subFormError}</div>}
          <div>
            <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Nome <span className="text-red-500">*</span></label>
            <input value={subForm.name} onChange={(e) => setSubForm({ ...subForm, name: e.target.value, slug: editSub ? subForm.slug : e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") })} placeholder="Ex: Smartphones"
              className={`w-full ${s.input} border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20`} />
          </div>
          <div>
            <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Slug <span className="text-red-500">*</span></label>
            <input value={subForm.slug} onChange={(e) => setSubForm({ ...subForm, slug: e.target.value })} placeholder="smartphones"
              className={`w-full ${s.input} border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20`} />
          </div>
          <div className={`flex justify-end gap-2 pt-2 border-t ${s.borderLight}`}>
            <button onClick={() => setSubModalOpen(false)} className={`px-4 py-2.5 rounded-xl text-xs font-medium ${s.btnSecondary}`}>Cancelar</button>
            <button onClick={saveSub} disabled={savingSub} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold ${s.btnPrimary} disabled:opacity-50 shadow-sm`}>
              {savingSub && <Loader2 className="h-4 w-4 animate-spin" />} {editSub ? "Guardar" : "Criar"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
