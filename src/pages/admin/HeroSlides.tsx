import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import Modal from "@/components/admin/Modal";
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Image as ImageIcon, Plus, Trash2, Edit3, Loader2, Upload, Globe, Store } from "lucide-react";
import { useToastNotification } from "@/contexts/ToastContext";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

interface SlideItem { id: number; title: string; subtitle: string; cta: string; cta_link: string; bg_color: string; image: string | null; store_slug: string | null; sort_order: number; }
const emptyForm = { title: "", subtitle: "", cta: "", cta_link: "", bg_color: "from-orange-500 to-pink-500", store_slug: "" };

const GRADIENTS = [
  { label: "Sem Gradiente", value: "none" },
  { label: "Laranja-Rosa", value: "from-orange-500 to-pink-500" },
  { label: "Azul-Violeta", value: "from-blue-500 to-violet-600" },
  { label: "Verde-Teal", value: "from-emerald-500 to-teal-600" },
  { label: "Vermelho-Laranja", value: "from-red-500 to-orange-500" },
  { label: "Indigo-Roxo", value: "from-indigo-500 to-purple-600" },
  { label: "Rosa-Violeta", value: "from-pink-500 to-violet-500" },
  { label: "Amber-Vermelho", value: "from-amber-500 to-red-500" },
  { label: "Cyan-Azul", value: "from-cyan-500 to-blue-600" },
  { label: "Cinza Escuro", value: "from-gray-800 to-gray-900" },
  { label: "Primary-Warning", value: "from-primary to-warning" },
];

const isNoneGradient = (v: string) => !v || v === "none";

export default function AdminHeroSlides() {
  const { token } = useAuth();
  const s = useAdminStyles();
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
    if (!token) return;
    setLoading(true);
    fetch(`${API}/admin/hero-slides`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } })
      .then((r) => r.json())
      .then((data) => setSlides(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSlides(); }, [token]);

  const openCreate = () => {
    setEditSlide(null); setForm(emptyForm); setImageFile(null); setImagePreview(""); setFormError(""); setModalOpen(true);
  };
  const openEdit = (sl: SlideItem) => {
    setEditSlide(sl);
    setForm({ title: sl.title, subtitle: sl.subtitle, cta: sl.cta, cta_link: sl.cta_link, bg_color: sl.bg_color, store_slug: sl.store_slug || "" });
    setImageFile(null); setImagePreview(sl.image || ""); setFormError(""); setModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); }
  };

  const saveSlide = async () => {
    if (!form.title) { setFormError("O titulo e obrigatorio."); return; }
    setSaving(true); setFormError("");

    const fd = new FormData();
    fd.append("title", form.title);
    fd.append("subtitle", form.subtitle);
    fd.append("cta", form.cta);
    fd.append("cta_link", form.cta_link);
    fd.append("bg_color", form.bg_color);
    fd.append("store_slug", form.store_slug);
    if (imageFile) fd.append("image", imageFile);

    const url = editSlide ? `${API}/admin/hero-slides/${editSlide.id}` : `${API}/admin/hero-slides`;
    if (editSlide) fd.append("_method", "PUT");

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
    const res = await fetch(`${API}/admin/hero-slides/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    setActionLoading(null); fetchSlides();
    if (res.ok) toast.success("Slide eliminado");
    else toast.error("Erro", "Nao foi possivel eliminar o slide.");
  };

  const globalSlides = slides.filter((sl) => !sl.store_slug);
  const storeSlides = slides.filter((sl) => sl.store_slug);

  const SlideCard = ({ slide }: { slide: SlideItem }) => (
    <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className={`rounded-2xl border ${s.card} ${s.cardHover} overflow-hidden transition-all group`}>
      {/* Slide visual */}
      <div className={`relative ${isNoneGradient(slide.bg_color) ? "bg-gray-900" : `bg-gradient-to-r ${slide.bg_color}`} h-36 overflow-hidden`}>
        {slide.image && (
          <img src={slide.image} alt="" className={`absolute inset-0 w-full h-full object-cover ${isNoneGradient(slide.bg_color) ? "" : "mix-blend-overlay opacity-60"}`} />
        )}
        <div className="relative z-10 p-4 flex flex-col justify-end h-full">
          <p className="text-sm font-bold text-white drop-shadow truncate">{slide.title}</p>
          {slide.subtitle && <p className="text-[11px] text-white/80 drop-shadow truncate">{slide.subtitle}</p>}
          {slide.cta && <span className="inline-block mt-2 px-3 py-1 rounded-lg bg-white/25 backdrop-blur-sm text-[10px] text-white font-semibold w-fit">{slide.cta}</span>}
        </div>
      </div>
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {slide.store_slug
            ? <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${s.badge("orange")}`}><Store className="h-2.5 w-2.5" />{slide.store_slug}</span>
            : <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${s.badge("blue")}`}><Globe className="h-2.5 w-2.5" />Global</span>
          }
          <span className={`text-[10px] ${s.textMuted}`}>{slide.cta_link}</span>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => openEdit(slide)} className={`p-1.5 rounded-lg ${s.textMuted} hover:text-orange-500 transition-colors`}><Edit3 className="h-3.5 w-3.5" /></button>
          <button onClick={() => deleteSlide(slide.id)} disabled={actionLoading === slide.id} className={`p-1.5 rounded-lg ${s.textMuted} hover:text-red-500 transition-colors disabled:opacity-50`}>
            {actionLoading === slide.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-bold ${s.textPrimary}`}>Hero Slides</h2>
          <p className={`text-xs ${s.textMuted}`}>{slides.length} slides</p>
        </div>
        <button onClick={openCreate} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${s.btnPrimary} text-xs font-semibold shadow-sm`}>
          <Plus className="h-4 w-4" /> Novo Slide
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className={`rounded-2xl border ${s.card} h-48 animate-pulse`} />)}
        </div>
      ) : slides.length === 0 ? (
        <div className={`rounded-2xl border ${s.card} py-16 text-center`}>
          <ImageIcon className={`h-12 w-12 ${s.empty} mx-auto mb-3`} />
          <p className={`text-sm ${s.textMuted}`}>Nenhum slide criado</p>
          <button onClick={openCreate} className={`mt-3 px-4 py-2 rounded-xl text-xs font-semibold ${s.btnPrimary}`}>Criar primeiro slide</button>
        </div>
      ) : (
        <>
          {globalSlides.length > 0 && (
            <div>
              <h3 className={`text-xs font-semibold ${s.textMuted} uppercase tracking-wider mb-3`}>Slides Globais ({globalSlides.length})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {globalSlides.map((sl) => <SlideCard key={sl.id} slide={sl} />)}
              </div>
            </div>
          )}
          {storeSlides.length > 0 && (
            <div>
              <h3 className={`text-xs font-semibold ${s.textMuted} uppercase tracking-wider mb-3`}>Slides de Lojas ({storeSlides.length})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {storeSlides.map((sl) => <SlideCard key={sl.id} slide={sl} />)}
              </div>
            </div>
          )}
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editSlide ? "Editar Slide" : "Novo Slide"} size="lg">
        <div className="space-y-4">
          {formError && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">{formError}</div>}

          {/* Image upload */}
          <div>
            <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Imagem do Slide</label>
            <div className="flex items-start gap-4">
              <div onClick={() => imgRef.current?.click()}
                className={`h-24 w-40 rounded-xl border-2 border-dashed ${s.isDark ? "border-white/10 hover:border-white/20" : "border-gray-300 hover:border-orange-400"} flex items-center justify-center cursor-pointer transition-colors overflow-hidden shrink-0`}>
                {imagePreview ? <img src={imagePreview} alt="" className="h-full w-full object-cover" />
                  : <div className="flex flex-col items-center gap-1"><Upload className={`h-6 w-6 ${s.textMuted}`} /><span className={`text-[10px] ${s.textMuted}`}>Upload</span></div>}
              </div>
              <div className={`text-xs ${s.textMuted} pt-1`}>
                <p>Imagem de fundo do slide</p>
                <p>JPG, PNG ate 4MB</p>
                <p className="mt-1">A imagem sera sobreposta ao gradiente</p>
              </div>
              <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </div>
          </div>

          {/* Gradient picker */}
          <div>
            <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Gradiente de Fundo</label>
            <div className="flex flex-wrap gap-2">
              {GRADIENTS.map((g) => (
                <button key={g.value} onClick={() => setForm({ ...form, bg_color: g.value })} type="button"
                  className={`h-8 w-16 rounded-lg transition-all ${
                    g.value === "none"
                      ? `border-2 border-dashed ${s.isDark ? "border-white/20" : "border-gray-300"} flex items-center justify-center text-[9px] font-medium ${s.isDark ? "text-white/40" : "text-gray-400"}`
                      : `bg-gradient-to-r ${g.value}`
                  } ${
                    form.bg_color === g.value ? "ring-2 ring-orange-400 ring-offset-2 scale-105" : "opacity-70 hover:opacity-100"
                  }`} title={g.label}>
                  {g.value === "none" && "Nenhum"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { l: "Titulo", k: "title", p: "Descubra as Melhores Ofertas", req: true },
              { l: "Subtitulo", k: "subtitle", p: "Ate 50% de desconto em tudo" },
              { l: "Texto do Botao", k: "cta", p: "Ver Ofertas" },
              { l: "Link do Botao", k: "cta_link", p: "/ofertas" },
              { l: "Loja (slug, vazio = global)", k: "store_slug", p: "techzone-angola" },
            ].map((f) => (
              <div key={f.k} className={f.k === "store_slug" ? "sm:col-span-2" : ""}>
                <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>{f.l} {f.req && <span className="text-red-500">*</span>}</label>
                <input value={(form as any)[f.k]} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} placeholder={f.p}
                  className={`w-full ${s.input} border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20`} />
              </div>
            ))}
          </div>

          {/* Live Preview */}
          <div>
            <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Pre-visualizacao</label>
            <div className={`relative rounded-xl ${isNoneGradient(form.bg_color) ? "bg-gray-900" : `bg-gradient-to-r ${form.bg_color || "from-gray-500 to-gray-600"}`} h-32 overflow-hidden`}>
              {imagePreview && (
                <img src={imagePreview} alt="" className={`absolute inset-0 w-full h-full object-cover ${isNoneGradient(form.bg_color) ? "" : "mix-blend-overlay opacity-60"}`} />
              )}
              <div className="relative z-10 p-5 flex flex-col justify-end h-full">
                <p className="text-sm font-bold text-white drop-shadow">{form.title || "Titulo do Slide..."}</p>
                {form.subtitle && <p className="text-xs text-white/80 drop-shadow">{form.subtitle}</p>}
                {form.cta && <span className="inline-block mt-2 px-4 py-1.5 rounded-lg bg-white/25 backdrop-blur-sm text-[11px] text-white font-semibold w-fit">{form.cta}</span>}
              </div>
            </div>
          </div>

          <div className={`flex justify-end gap-2 pt-2 border-t ${s.borderLight}`}>
            <button onClick={() => setModalOpen(false)} className={`px-4 py-2.5 rounded-xl text-xs font-medium ${s.btnSecondary}`}>Cancelar</button>
            <button onClick={saveSlide} disabled={saving} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold ${s.btnPrimary} disabled:opacity-50 shadow-sm`}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} {editSlide ? "Guardar" : "Criar Slide"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
