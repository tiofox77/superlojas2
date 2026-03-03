import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import Modal from "@/components/admin/Modal";
import { useEffect, useState, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { Image as ImageIcon, Plus, Trash2, Edit3, Loader2, Upload } from "lucide-react";
import { useToastNotification } from "@/contexts/ToastContext";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

interface SlideItem { id: number; title: string; subtitle: string; cta: string; cta_link: string; bg_color: string; image: string | null; sort_order: number; }
const emptyForm = { title: "", subtitle: "", cta: "", cta_link: "", bg_color: "from-emerald-500 to-teal-500" };

const GRADIENTS = [
  "from-orange-500 to-pink-500", "from-blue-500 to-violet-600", "from-emerald-500 to-teal-600",
  "from-red-500 to-orange-500", "from-indigo-500 to-purple-600", "from-pink-500 to-violet-500",
  "from-amber-500 to-red-500", "from-cyan-500 to-blue-600", "from-gray-800 to-gray-900",
];

export default function StorePanelSlides() {
  const { token } = useAuth();
  const s = useAdminStyles();
  const { slug } = useOutletContext<{ slug: string }>();
  const toast = useToastNotification();
  const [slides, setSlides] = useState<SlideItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editSlide, setEditSlide] = useState<SlideItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  const fetchSlides = () => {
    if (!token || !slug) return;
    setLoading(true);
    fetch(`${API}/store-panel/${slug}/slides`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } })
      .then((r) => r.json())
      .then((data) => setSlides(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSlides(); }, [token, slug]);

  const openCreate = () => { setEditSlide(null); setForm(emptyForm); setImageFile(null); setImagePreview(""); setFormError(""); setModalOpen(true); };
  const openEdit = (sl: SlideItem) => {
    setEditSlide(sl);
    setForm({ title: sl.title, subtitle: sl.subtitle, cta: sl.cta, cta_link: sl.cta_link, bg_color: sl.bg_color });
    setImageFile(null); setImagePreview(sl.image || ""); setFormError(""); setModalOpen(true);
  };

  const saveSlide = async () => {
    if (!form.title || !form.subtitle || !form.cta || !form.cta_link) { setFormError("Preencha todos os campos."); return; }
    setSaving(true); setFormError("");
    const fd = new FormData();
    fd.append("title", form.title);
    fd.append("subtitle", form.subtitle);
    fd.append("cta", form.cta);
    fd.append("cta_link", form.cta_link);
    fd.append("bg_color", form.bg_color);
    if (imageFile) fd.append("image", imageFile);
    if (editSlide) fd.append("_method", "PUT");

    const url = editSlide ? `${API}/store-panel/${slug}/slides/${editSlide.id}` : `${API}/store-panel/${slug}/slides`;
    try {
      const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, body: fd });
      const data = await res.json();
      if (!res.ok) { setFormError(data.errors ? (Object.values(data.errors).flat().join(", ") as string) : data.message || "Erro"); toast.error("Erro", "Nao foi possivel guardar o slide."); }
      else { setModalOpen(false); fetchSlides(); toast.success(editSlide ? "Slide actualizado" : "Slide criado", `"${form.title}" guardado com sucesso.`); }
    } finally { setSaving(false); }
  };

  const deleteSlide = async (id: number) => {
    if (!confirm("Eliminar este slide?")) return;
    setActionLoading(id);
    const res = await fetch(`${API}/store-panel/${slug}/slides/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    setActionLoading(null); fetchSlides();
    if (res.ok) toast.success("Slide eliminado");
    else toast.error("Erro", "Nao foi possivel eliminar o slide.");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-bold ${s.textPrimary}`}>Hero Slides</h2>
          <p className={`text-xs ${s.textMuted}`}>{slides.length} slides da sua loja</p>
        </div>
        <button onClick={openCreate} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${s.btnPrimary} text-xs font-semibold shadow-sm`}>
          <Plus className="h-4 w-4" /> Novo Slide
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => <div key={i} className={`rounded-2xl border ${s.card} h-48 animate-pulse`} />)}
        </div>
      ) : slides.length === 0 ? (
        <div className={`rounded-2xl border ${s.card} py-16 text-center`}>
          <ImageIcon className={`h-12 w-12 ${s.empty} mx-auto mb-3`} />
          <p className={`text-sm ${s.textMuted}`}>Nenhum slide</p>
          <button onClick={openCreate} className={`mt-3 px-4 py-2 rounded-xl text-xs font-semibold ${s.btnPrimary}`}>Criar primeiro slide</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {slides.map((sl) => (
            <motion.div key={sl.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className={`rounded-2xl border ${s.card} ${s.cardHover} overflow-hidden transition-all group`}>
              <div className={`relative bg-gradient-to-r ${sl.bg_color} h-36 overflow-hidden`}>
                {sl.image && <img src={sl.image} alt="" className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60" />}
                <div className="relative z-10 p-4 flex flex-col justify-end h-full">
                  <p className="text-sm font-bold text-white drop-shadow truncate">{sl.title}</p>
                  <p className="text-[11px] text-white/80 drop-shadow truncate">{sl.subtitle}</p>
                  <span className="inline-block mt-2 px-3 py-1 rounded-lg bg-white/25 backdrop-blur-sm text-[10px] text-white font-semibold w-fit">{sl.cta}</span>
                </div>
              </div>
              <div className="p-3 flex items-center justify-between">
                <span className={`text-[10px] ${s.textMuted}`}>{sl.cta_link}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(sl)} className={`p-1.5 rounded-lg ${s.textMuted} hover:text-emerald-500 transition-colors`}><Edit3 className="h-3.5 w-3.5" /></button>
                  <button onClick={() => deleteSlide(sl.id)} disabled={actionLoading === sl.id} className={`p-1.5 rounded-lg ${s.textMuted} hover:text-red-500 transition-colors disabled:opacity-50`}>
                    {actionLoading === sl.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editSlide ? "Editar Slide" : "Novo Slide"} size="lg">
        <div className="space-y-4">
          {formError && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">{formError}</div>}
          <div>
            <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Imagem</label>
            <div className="flex items-start gap-4">
              <div onClick={() => imgRef.current?.click()}
                className={`h-24 w-40 rounded-xl border-2 border-dashed ${s.isDark ? "border-white/10" : "border-gray-300 hover:border-emerald-400"} flex items-center justify-center cursor-pointer transition-colors overflow-hidden shrink-0`}>
                {imagePreview ? <img src={imagePreview} alt="" className="h-full w-full object-cover" />
                  : <Upload className={`h-6 w-6 ${s.textMuted}`} />}
              </div>
              <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); } }} />
              <p className={`text-xs ${s.textMuted} pt-1`}>JPG, PNG ate 4MB</p>
            </div>
          </div>
          <div>
            <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Gradiente</label>
            <div className="flex flex-wrap gap-2">
              {GRADIENTS.map((g) => (
                <button key={g} onClick={() => setForm({ ...form, bg_color: g })} type="button"
                  className={`h-8 w-14 rounded-lg bg-gradient-to-r ${g} transition-all ${form.bg_color === g ? "ring-2 ring-emerald-400 ring-offset-2 scale-105" : "opacity-70 hover:opacity-100"}`} />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { l: "Titulo", k: "title", p: "Ofertas Especiais", req: true },
              { l: "Subtitulo", k: "subtitle", p: "Ate 50% desconto", req: true },
              { l: "Texto Botao", k: "cta", p: "Ver Ofertas", req: true },
              { l: "Link", k: "cta_link", p: "/ofertas", req: true },
            ].map((f) => (
              <div key={f.k}>
                <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>{f.l} <span className="text-red-500">*</span></label>
                <input value={(form as any)[f.k]} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} placeholder={f.p}
                  className={`w-full ${s.input} border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20`} />
              </div>
            ))}
          </div>
          {/* Preview */}
          <div className={`relative rounded-xl bg-gradient-to-r ${form.bg_color} h-28 overflow-hidden`}>
            {imagePreview && <img src={imagePreview} alt="" className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60" />}
            <div className="relative z-10 p-4 flex flex-col justify-end h-full">
              <p className="text-sm font-bold text-white drop-shadow">{form.title || "Titulo..."}</p>
              <p className="text-xs text-white/80 drop-shadow">{form.subtitle || "Subtitulo..."}</p>
              <span className="inline-block mt-1 px-3 py-1 rounded-lg bg-white/25 text-[10px] text-white font-semibold w-fit">{form.cta || "Botao"}</span>
            </div>
          </div>
          <div className={`flex justify-end gap-2 pt-2 border-t ${s.borderLight}`}>
            <button onClick={() => setModalOpen(false)} className={`px-4 py-2.5 rounded-xl text-xs font-medium ${s.btnSecondary}`}>Cancelar</button>
            <button onClick={saveSlide} disabled={saving} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold ${s.btnPrimary} disabled:opacity-50 shadow-sm`}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} {editSlide ? "Guardar" : "Criar"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
