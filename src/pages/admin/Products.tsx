import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import Modal from "@/components/admin/Modal";
import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Package, Search, Trash2, Star, Image as ImageIcon, Store, Tag, Edit3, Plus, Loader2, Upload, X, Eye, Calendar, Hash, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToastNotification } from "@/contexts/ToastContext";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";
const BASE = API.replace(/\/api\/?$/, "");
const imgUrl = (src: string) => src.startsWith("/storage") ? `${BASE}${src}` : src;

interface SubcategoryItem { id: number; category_id: number; name: string; slug: string; }
interface CategoryItem { id: number; name: string; slug: string; icon: string; subcategories?: SubcategoryItem[]; }

interface ProductItem {
  id: number; name: string; slug: string; price: number; original_price: number | null;
  images: string[]; category: string; category_id: number | null; subcategory_id: number | null; badge: string | null; rating: string;
  review_count: number; stock: number; description?: string; store?: { id: number; name: string; slug?: string }; created_at: string;
}

const emptyForm = { name: "", slug: "", price: "", original_price: "", stock: "", category: "", category_id: "", subcategory_id: "", badge: "", store_id: "", description: "" };

function slugify(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function titleCase(text: string): string {
  return text.replace(/\b\w+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

type FieldErrors = Record<string, string>;

export default function AdminProducts() {
  const { token } = useAuth();
  const s = useAdminStyles();
  const navigate = useNavigate();
  const toast = useToastNotification();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editProd, setEditProd] = useState<ProductItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [detailProd, setDetailProd] = useState<ProductItem | null>(null);
  const [detailImg, setDetailImg] = useState(0);
  const imgRef = useRef<HTMLInputElement>(null);
  const [allStores, setAllStores] = useState<{ id: number; name: string }[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [slugManual, setSlugManual] = useState(false);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [slugSuggestion, setSlugSuggestion] = useState<string | null>(null);
  const slugTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProducts = () => {
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams({ per_page: "12", page: String(page) });
    if (search) params.set("search", search);
    fetch(`${API}/admin/products?${params}`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } })
      .then((r) => r.json())
      .then((data) => { setProducts(data.data || []); setTotalPages(data.last_page || 1); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProducts(); }, [token, page]);
  useEffect(() => {
    if (!token) return;
    fetch(`${API}/admin/stores`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } })
      .then(r => r.json()).then((d: any) => setAllStores(Array.isArray(d) ? d : (d?.data || [])));
  }, [token]);
  useEffect(() => {
    fetch(`${API}/categories`, { headers: { Accept: "application/json" } })
      .then(r => r.json()).then(d => setCategories(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const currentSubcategories = categories.find(c => String(c.id) === form.category_id)?.subcategories || [];
  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchProducts(); };

  const openCreate = () => { setEditProd(null); setForm(emptyForm); setImageFiles([]); setImagePreviews([]); setExistingImages([]); setFormError(""); setFieldErrors({}); setSlugManual(false); setSlugStatus("idle"); setSlugSuggestion(null); setModalOpen(true); };
  const openEdit = (p: ProductItem) => {
    setEditProd(p);
    setForm({ name: p.name, slug: p.slug, price: String(p.price), original_price: p.original_price ? String(p.original_price) : "", stock: String(p.stock), category: p.category, category_id: p.category_id ? String(p.category_id) : "", subcategory_id: p.subcategory_id ? String(p.subcategory_id) : "", badge: p.badge || "", store_id: p.store?.id ? String(p.store.id) : "", description: "" });
    setImageFiles([]); setImagePreviews([]); setExistingImages(p.images || []); setFormError(""); setFieldErrors({}); setSlugManual(true); setSlugStatus("idle"); setSlugSuggestion(null); setModalOpen(true);
  };

  const handleNameChange = (raw: string) => {
    const name = titleCase(raw);
    const updated = { ...form, name };
    if (!slugManual) updated.slug = slugify(name);
    setForm(updated);
    setFieldErrors(prev => { const n = { ...prev }; delete n.name; return n; });
  };

  const handleSlugChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSlugManual(true);
    setForm({ ...form, slug: clean });
    setFieldErrors(prev => { const n = { ...prev }; delete n.slug; return n; });
  };

  const checkSlugAvailability = useCallback((slugVal: string, excludeId?: number) => {
    if (!slugVal || slugVal.length < 2) { setSlugStatus("idle"); setSlugSuggestion(null); return; }
    setSlugStatus("checking"); setSlugSuggestion(null);
    const params = new URLSearchParams({ slug: slugVal });
    if (excludeId) params.set("exclude", String(excludeId));
    fetch(`${API}/admin/products/check-slug?${params}`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } })
      .then(r => { if (!r.ok) throw new Error('request failed'); return r.json(); })
      .then(d => { setSlugStatus(d.available ? "available" : "taken"); if (d.suggestion) setSlugSuggestion(d.suggestion); })
      .catch(() => setSlugStatus("idle"));
  }, [token]);

  useEffect(() => {
    if (!modalOpen || !form.slug) { setSlugStatus("idle"); return; }
    if (slugTimerRef.current) clearTimeout(slugTimerRef.current);
    slugTimerRef.current = setTimeout(() => checkSlugAvailability(form.slug, editProd?.id), 400);
    return () => { if (slugTimerRef.current) clearTimeout(slugTimerRef.current); };
  }, [form.slug, modalOpen, editProd, checkSlugAvailability]);

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImageFiles((prev) => [...prev, ...files]);
    setImagePreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
    if (imgRef.current) imgRef.current.value = "";
  };

  const removeNewImage = (idx: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
    setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeExistingImage = (idx: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== idx));
  };

  // Combined index: 0..existingImages.length-1 = existing, rest = new
  const totalImages = existingImages.length + imagePreviews.length;
  const setFeatured = (combinedIdx: number) => {
    if (combinedIdx < existingImages.length) {
      // Click on existing image → move to index 0 of existing
      setExistingImages((prev) => { const n = [...prev]; const [img] = n.splice(combinedIdx, 1); return [img, ...n]; });
    } else {
      // Click on new image → move to first position overall:
      // move all existing after it, and this new image becomes the first existing-equivalent
      const newIdx = combinedIdx - existingImages.length;
      if (existingImages.length === 0) {
        // No existing: just reorder new files
        setImageFiles((prev) => { const n = [...prev]; const [f] = n.splice(newIdx, 1); return [f, ...n]; });
        setImagePreviews((prev) => { const n = [...prev]; const [p] = n.splice(newIdx, 1); return [p, ...n]; });
      } else {
        // Has existing images: move the clicked new image to front of new array
        // so it becomes position existingImages.length, then swap with existing[0]
        setImageFiles((prev) => { const n = [...prev]; const [f] = n.splice(newIdx, 1); return [f, ...n]; });
        setImagePreviews((prev) => { const n = [...prev]; const [p] = n.splice(newIdx, 1); return [p, ...n]; });
      }
    }
  };

  const saveProduct = async () => {
    const errs: FieldErrors = {};
    if (!form.name) errs.name = "Nome e obrigatorio.";
    if (!form.slug) errs.slug = "Slug e obrigatorio.";
    else if (slugStatus === "taken") errs.slug = "Este slug ja esta em uso.";
    if (!form.price) errs.price = "Preco e obrigatorio.";
    if (!form.category && !form.category_id) errs.category_id = "Seleccione uma categoria.";
    if (!editProd && !form.store_id) errs.store_id = "Seleccione uma loja.";
    if (!editProd && imageFiles.length === 0) errs.images = "Pelo menos uma imagem e obrigatoria.";
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); setFormError(""); return; }
    setSaving(true); setFormError(""); setFieldErrors({});

    const fd = new FormData();
    fd.append("name", form.name);
    fd.append("slug", form.slug);
    fd.append("price", form.price);
    if (form.original_price) fd.append("original_price", form.original_price);
    fd.append("stock", form.stock || "0");
    fd.append("category", form.category);
    if (form.category_id) fd.append("category_id", form.category_id);
    if (form.subcategory_id) fd.append("subcategory_id", form.subcategory_id);
    if (form.badge) fd.append("badge", form.badge);
    if (form.description) fd.append("description", form.description);
    if (form.store_id) fd.append("store_id", form.store_id);

    if (editProd) {
      fd.append("_method", "PUT");
      existingImages.forEach((img) => fd.append("existing_images[]", img));
      imageFiles.forEach((file) => fd.append("new_images[]", file));
    } else {
      imageFiles.forEach((file) => fd.append("images[]", file));
    }

    const url = editProd ? `${API}/admin/products/${editProd.id}` : `${API}/admin/products`;
    try {
      const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, body: fd });
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) {
          const mapped: FieldErrors = {};
          for (const [key, msgs] of Object.entries(data.errors)) mapped[key] = (msgs as string[]).join(" ");
          setFieldErrors(mapped);
        } else { setFormError(data.message || "Erro ao guardar."); }
        toast.error("Erro", "Nao foi possivel guardar o produto.");
      }
      else { setModalOpen(false); fetchProducts(); toast.success(editProd ? "Produto actualizado" : "Produto criado", `"${form.name}" guardado com sucesso.`); }
    } finally { setSaving(false); }
  };

  const deleteProduct = async (id: number, name: string) => {
    if (!confirm(`Eliminar "${name}"?`)) return;
    setActionLoading(id);
    const res = await fetch(`${API}/admin/products/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    setActionLoading(null); fetchProducts();
    if (res.ok) toast.success("Produto eliminado", `"${name}" foi removido.`);
    else toast.error("Erro", "Nao foi possivel eliminar o produto.");
  };

  const fmt = (val: number) => new Intl.NumberFormat("pt-AO").format(val);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className={`text-lg font-bold ${s.textPrimary}`}>Gestao de Produtos</h2>
          <p className={`text-xs ${s.textMuted}`}>Todos os produtos do marketplace</p>
        </div>
        <button onClick={openCreate} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${s.btnPrimary} text-xs font-semibold shadow-sm`}>
          <Plus className="h-4 w-4" /> Novo Produto
        </button>
      </div>

      <form onSubmit={handleSearch}>
        <div className="relative max-w-md">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${s.textMuted}`} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar produtos..."
            className={`w-full ${s.input} border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20`} />
        </div>
      </form>

      <div className={`rounded-2xl border ${s.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${s.borderLight}`}>
                {["Produto", "Loja", "Preco", "Categoria", "Stock", "Rating", "Accoes"].map((h, i) => (
                  <th key={h} className={`text-left text-[10px] font-semibold ${s.thText} uppercase tracking-wider px-5 py-3 ${i === 1 ? "hidden md:table-cell" : ""} ${i >= 3 && i <= 5 ? "hidden lg:table-cell" : ""} ${i === 6 ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${s.borderLight}`}>
              {loading ? [...Array(6)].map((_, i) => <tr key={i}><td colSpan={7} className="px-5 py-4"><div className={`h-4 ${s.skeleton} rounded animate-pulse`} /></td></tr>)
              : products.length === 0 ? <tr><td colSpan={7} className="text-center py-12"><Package className={`h-10 w-10 ${s.empty} mx-auto mb-2`} /><p className={`text-xs ${s.textMuted}`}>Nenhum produto</p></td></tr>
              : products.map((p) => (
                <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`${s.hoverRow} transition-colors`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {p.images?.[0] ? <img src={imgUrl(p.images[0])} alt="" className="h-10 w-10 rounded-xl object-cover bg-gray-100" />
                        : <div className={`h-10 w-10 rounded-xl ${s.isDark ? "bg-white/5" : "bg-gray-100"} flex items-center justify-center`}><ImageIcon className={`h-4 w-4 ${s.textMuted}`} /></div>}
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold ${s.textPrimary} truncate max-w-[180px]`}>{p.name}</p>
                        {p.badge && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${p.badge === "Promo" ? s.badge("red") : s.badge("blue")}`}>{p.badge}</span>}
                      </div>
                    </div>
                  </td>
                  <td className={`px-5 py-3 hidden md:table-cell`}>
                    <div className={`flex items-center gap-1.5 text-xs ${s.textSecondary}`}><Store className="h-3 w-3" /><span className="truncate max-w-[120px]">{p.store?.name || "—"}</span></div>
                  </td>
                  <td className="px-5 py-3">
                    <p className={`text-xs font-semibold ${s.textPrimary}`}>{fmt(p.price)} Kz</p>
                    {p.original_price && <p className={`text-[10px] ${s.textMuted} line-through`}>{fmt(p.original_price)} Kz</p>}
                  </td>
                  <td className="px-5 py-3 hidden lg:table-cell">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${s.badge("purple")}`}><Tag className="h-2.5 w-2.5" /> {p.category}</span>
                  </td>
                  <td className="px-5 py-3 hidden lg:table-cell">
                    <span className={`text-xs font-medium ${p.stock > 0 ? "text-green-500" : "text-red-500"}`}>{p.stock > 0 ? p.stock : "Esgotado"}</span>
                  </td>
                  <td className="px-5 py-3 hidden lg:table-cell">
                    <div className={`flex items-center gap-1 text-xs ${s.textSecondary}`}><Star className="h-3 w-3 text-amber-400 fill-amber-400" />{parseFloat(p.rating).toFixed(1)}</div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => { setDetailProd(p); setDetailImg(0); }} className={`p-1.5 rounded-lg ${s.textMuted} hover:text-cyan-500 transition-colors`} title="Ver Detalhes"><Eye className="h-4 w-4" /></button>
                      <button onClick={() => openEdit(p)} className={`p-1.5 rounded-lg ${s.textMuted} hover:text-orange-500 transition-colors`} title="Editar"><Edit3 className="h-4 w-4" /></button>
                      <button onClick={() => deleteProduct(p.id, p.name)} disabled={actionLoading === p.id} className={`p-1.5 rounded-lg ${s.textMuted} hover:text-red-500 transition-colors disabled:opacity-50`} title="Eliminar">{actionLoading === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className={`flex items-center justify-between px-5 py-3 border-t ${s.borderLight}`}>
            <p className={`text-[11px] ${s.textMuted}`}>Pagina {page} de {totalPages}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className={`px-3 py-1.5 rounded-lg text-xs ${s.btnSecondary} disabled:opacity-30`}>Anterior</button>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className={`px-3 py-1.5 rounded-lg text-xs ${s.btnSecondary} disabled:opacity-30`}>Proximo</button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal open={!!detailProd} onClose={() => setDetailProd(null)} title="Detalhes do Produto" size="xl">
        {detailProd && (
          <div className="space-y-5">
            {/* Image gallery */}
            <div className="flex flex-col sm:flex-row gap-5">
              <div className="relative w-full sm:w-64 shrink-0">
                {detailProd.images?.length > 0 ? (
                  <div className="relative">
                    <img src={imgUrl(detailProd.images[detailImg])} alt="" className="w-full h-56 rounded-xl object-cover" />
                    {detailProd.images.length > 1 && (
                      <>
                        <button onClick={() => setDetailImg((detailImg - 1 + detailProd.images.length) % detailProd.images.length)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"><ChevronLeft className="h-4 w-4" /></button>
                        <button onClick={() => setDetailImg((detailImg + 1) % detailProd.images.length)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"><ChevronRight className="h-4 w-4" /></button>
                      </>
                    )}
                    <div className="flex gap-1.5 mt-2">
                      {detailProd.images.map((img, i) => (
                        <button key={i} onClick={() => setDetailImg(i)}
                          className={`h-12 w-12 rounded-lg overflow-hidden border-2 transition-colors ${i === detailImg ? "border-orange-500" : s.isDark ? "border-white/10" : "border-gray-200"}`}>
                          <img src={imgUrl(img)} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className={`w-full h-56 rounded-xl ${s.isDark ? "bg-white/5" : "bg-gray-100"} flex items-center justify-center`}>
                    <ImageIcon className={`h-12 w-12 ${s.textMuted}`} />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`text-lg font-bold ${s.textPrimary}`}>{detailProd.name}</h3>
                    {detailProd.badge && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${detailProd.badge === "Promo" ? s.badge("red") : s.badge("blue")}`}>{detailProd.badge}</span>}
                  </div>
                  <p className={`text-xs ${s.textMuted} mt-0.5`}>/{detailProd.slug}</p>
                </div>

                <div className="flex items-baseline gap-3">
                  <span className={`text-xl font-bold ${s.textPrimary}`}>{new Intl.NumberFormat("pt-AO").format(detailProd.price)} Kz</span>
                  {detailProd.original_price && (
                    <span className={`text-sm ${s.textMuted} line-through`}>{new Intl.NumberFormat("pt-AO").format(detailProd.original_price)} Kz</span>
                  )}
                  {detailProd.original_price && detailProd.original_price > detailProd.price && (
                    <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-0.5 rounded-full">
                      -{Math.round(((detailProd.original_price - detailProd.price) / detailProd.original_price) * 100)}%
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className={`rounded-xl p-3 ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}>
                    <p className={`text-[10px] ${s.textMuted} uppercase tracking-wider`}>Categoria</p>
                    <p className={`text-xs font-semibold ${s.textPrimary} mt-0.5 flex items-center gap-1`}><Tag className="h-3 w-3" /> {detailProd.category}</p>
                  </div>
                  <div className={`rounded-xl p-3 ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}>
                    <p className={`text-[10px] ${s.textMuted} uppercase tracking-wider`}>Stock</p>
                    <p className={`text-xs font-semibold mt-0.5 ${detailProd.stock > 0 ? "text-green-500" : "text-red-500"}`}>{detailProd.stock > 0 ? `${detailProd.stock} unidades` : "Esgotado"}</p>
                  </div>
                  <div className={`rounded-xl p-3 ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}>
                    <p className={`text-[10px] ${s.textMuted} uppercase tracking-wider`}>Avaliacao</p>
                    <p className={`text-xs font-semibold ${s.textPrimary} mt-0.5 flex items-center gap-1`}><Star className="h-3 w-3 text-amber-400 fill-amber-400" /> {parseFloat(detailProd.rating).toFixed(1)} ({detailProd.review_count})</p>
                  </div>
                  <div className={`rounded-xl p-3 ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}>
                    <p className={`text-[10px] ${s.textMuted} uppercase tracking-wider`}>Loja</p>
                    <p className={`text-xs font-semibold ${s.textPrimary} mt-0.5 flex items-center gap-1`}><Store className="h-3 w-3" /> {detailProd.store?.name || "—"}</p>
                  </div>
                </div>

                <div className={`flex items-center gap-4 text-[11px] ${s.textMuted}`}>
                  <span className="flex items-center gap-1"><Hash className="h-3 w-3" /> ID: {detailProd.id}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(detailProd.created_at).toLocaleDateString("pt-AO")}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            {detailProd.description && (
              <div className={`rounded-xl p-4 ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}>
                <p className={`text-[10px] ${s.textMuted} uppercase tracking-wider mb-1.5`}>Descricao</p>
                <p className={`text-sm ${s.textSecondary} whitespace-pre-line`}>{detailProd.description}</p>
              </div>
            )}

            {/* Actions */}
            <div className={`flex justify-end gap-2 pt-3 border-t ${s.borderLight}`}>
              <button onClick={() => navigate(`/produto/${detailProd.slug}`)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium ${s.btnSecondary}`}>
                <Eye className="h-3.5 w-3.5" /> Ver na Loja
              </button>
              <button onClick={() => { setDetailProd(null); openEdit(detailProd); }} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold ${s.btnPrimary} shadow-sm`}>
                <Edit3 className="h-3.5 w-3.5" /> Editar Produto
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editProd ? "Editar Produto" : "Novo Produto"} size="lg">
        <div className="space-y-4">
          {formError && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">{formError}</div>}

          {/* Imagens upload */}
          <div>
            <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Imagens {!editProd && <span className="text-red-500">*</span>}</label>
            {fieldErrors.images && <p className="text-[11px] text-red-500 mb-1">{fieldErrors.images}</p>}
            {totalImages > 1 && <p className={`text-[10px] ${s.textMuted} mb-1`}>Clique numa imagem para a definir como destaque (primeira = destaque)</p>}
            <div className="flex flex-wrap gap-2">
              {existingImages.map((img, i) => {
                const isFeatured = i === 0 && totalImages > 1;
                return (
                  <div key={`ex-${i}`} className={`relative h-16 w-16 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${isFeatured ? "border-orange-500 ring-2 ring-orange-500/30" : s.isDark ? "border-white/10 hover:border-orange-300" : "border-gray-200 hover:border-orange-300"}`}
                    onClick={() => setFeatured(i)}>
                    <img src={imgUrl(img)} alt="" className="h-full w-full object-cover" />
                    {isFeatured && <span className="absolute bottom-0 left-0 right-0 bg-orange-500 text-white text-[8px] font-bold text-center leading-tight py-0.5"><Star className="h-2.5 w-2.5 inline fill-white" /> Destaque</span>}
                    <button onClick={(e) => { e.stopPropagation(); removeExistingImage(i); }} className="absolute top-0 right-0 bg-red-500 text-white rounded-bl p-0.5"><X className="h-3 w-3" /></button>
                  </div>
                );
              })}
              {imagePreviews.map((prev, i) => {
                const combinedIdx = existingImages.length + i;
                const isFeatured = combinedIdx === 0 && totalImages > 1;
                return (
                  <div key={`new-${i}`} className={`relative h-16 w-16 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${isFeatured ? "border-orange-500 ring-2 ring-orange-500/30" : "border-orange-200 hover:border-orange-400"}`}
                    onClick={() => setFeatured(combinedIdx)}>
                    <img src={prev} alt="" className="h-full w-full object-cover" />
                    {isFeatured && <span className="absolute bottom-0 left-0 right-0 bg-orange-500 text-white text-[8px] font-bold text-center leading-tight py-0.5"><Star className="h-2.5 w-2.5 inline fill-white" /> Destaque</span>}
                    <button onClick={(e) => { e.stopPropagation(); removeNewImage(i); }} className="absolute top-0 right-0 bg-red-500 text-white rounded-bl p-0.5"><X className="h-3 w-3" /></button>
                  </div>
                );
              })}
              <button type="button" onClick={() => imgRef.current?.click()}
                className={`h-16 w-16 rounded-lg border-2 border-dashed ${s.isDark ? "border-white/10 hover:border-white/20" : "border-gray-300 hover:border-orange-400"} flex items-center justify-center cursor-pointer transition-colors`}>
                <Upload className={`h-5 w-5 ${s.textMuted}`} />
              </button>
              <input ref={imgRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageAdd} />
            </div>
            <p className={`text-[10px] ${s.textMuted} mt-1`}>JPG, PNG ate 4MB cada</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nome */}
            <div>
              <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Nome <span className="text-red-500">*</span></label>
              <input type="text" value={form.name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Nome do produto"
                className={`w-full ${s.input} border ${fieldErrors.name ? "border-red-400" : ""} rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20`} />
              {fieldErrors.name && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.name}</p>}
            </div>
            {/* Slug */}
            <div>
              <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Slug <span className="text-red-500">*</span></label>
              <div className="relative">
                <input type="text" value={form.slug} onChange={(e) => handleSlugChange(e.target.value)} placeholder="nome-do-produto"
                  className={`w-full ${s.input} border ${fieldErrors.slug ? "border-red-400" : slugStatus === "available" ? "border-green-400" : slugStatus === "taken" ? "border-red-400" : ""} rounded-xl px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20`} />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  {slugStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                  {slugStatus === "available" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  {slugStatus === "taken" && <AlertCircle className="h-4 w-4 text-red-500" />}
                </span>
              </div>
              {fieldErrors.slug && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.slug}</p>}
              {!fieldErrors.slug && slugStatus === "taken" && (
                <p className="text-[11px] text-red-500 mt-1">
                  Este slug ja esta em uso.{slugSuggestion && <> Sugestao: <button type="button" className="underline font-semibold hover:text-red-700" onClick={() => { setForm(f => ({ ...f, slug: slugSuggestion })); setSlugManual(true); setSlugSuggestion(null); }}>{slugSuggestion}</button></>}
                </p>
              )}
              {slugStatus === "available" && <p className="text-[11px] text-green-500 mt-1">Slug disponivel!</p>}
            </div>
            {/* Preco, Original, Stock */}
            {[
              { l: "Preco (Kz)", k: "price", p: "15000", req: true, type: "number" },
              { l: "Preco Original (Kz)", k: "original_price", p: "20000", type: "number" },
              { l: "Stock", k: "stock", p: "100", type: "number" },
            ].map((f) => (
              <div key={f.k}>
                <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>{f.l} {f.req && <span className="text-red-500">*</span>}</label>
                <input type={f.type || "text"} value={(form as any)[f.k]} onChange={(e) => { setForm({ ...form, [f.k]: e.target.value }); setFieldErrors(prev => { const n = { ...prev }; delete n[f.k]; return n; }); }} placeholder={f.p}
                  className={`w-full ${s.input} border ${fieldErrors[f.k] ? "border-red-400" : ""} rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20`} />
                {fieldErrors[f.k] && <p className="text-[11px] text-red-500 mt-1">{fieldErrors[f.k]}</p>}
              </div>
            ))}
            {/* Categoria dropdown */}
            <div>
              <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Categoria <span className="text-red-500">*</span></label>
              <select value={form.category_id} onChange={(e) => {
                const catId = e.target.value;
                const cat = categories.find(c => String(c.id) === catId);
                setForm({ ...form, category_id: catId, category: cat?.name || "", subcategory_id: "" });
                setFieldErrors(prev => { const n = { ...prev }; delete n.category_id; return n; });
              }} className={`w-full ${s.input} border ${fieldErrors.category_id ? "border-red-400" : ""} rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20`}>
                <option value="">Seleccionar categoria...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
              {fieldErrors.category_id && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.category_id}</p>}
            </div>
            {/* Subcategoria dropdown */}
            <div>
              <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Subcategoria</label>
              <select value={form.subcategory_id} onChange={(e) => setForm({ ...form, subcategory_id: e.target.value })}
                disabled={!form.category_id || currentSubcategories.length === 0}
                className={`w-full ${s.input} border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 disabled:opacity-50`}>
                <option value="">{!form.category_id ? "Seleccione categoria primeiro" : currentSubcategories.length === 0 ? "Sem subcategorias" : "Seleccionar..."}</option>
                {currentSubcategories.map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
              </select>
            </div>
            {/* Badge */}
            <div>
              <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Badge</label>
              <select value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })}
                className={`w-full ${s.input} border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20`}>
                <option value="">Nenhum</option>
                <option value="Novo">Novo</option>
                <option value="Usado">Usado</option>
                <option value="Promo">Promo</option>
              </select>
            </div>
            {/* Loja select */}
            <div>
              <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Loja {!editProd && <span className="text-red-500">*</span>}</label>
              <select value={form.store_id} onChange={(e) => { setForm({ ...form, store_id: e.target.value }); setFieldErrors(prev => { const n = { ...prev }; delete n.store_id; return n; }); }}
                className={`w-full ${s.input} border ${fieldErrors.store_id ? "border-red-400" : ""} rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20`}>
                <option value="">Seleccionar loja...</option>
                {allStores.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
              </select>
              {fieldErrors.store_id && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.store_id}</p>}
            </div>
          </div>
          <div>
            <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Descricao</label>
            <textarea value={form.description} onChange={(e) => { setForm({ ...form, description: e.target.value }); setFieldErrors(prev => { const n = { ...prev }; delete n.description; return n; }); }} rows={3} placeholder="Descricao do produto..."
              className={`w-full ${s.input} border ${fieldErrors.description ? "border-red-400" : ""} rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 resize-none`} />
            {fieldErrors.description && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.description}</p>}
          </div>
          <div className={`flex justify-end gap-2 pt-2 border-t ${s.borderLight}`}>
            <button onClick={() => setModalOpen(false)} className={`px-4 py-2.5 rounded-xl text-xs font-medium ${s.btnSecondary}`}>Cancelar</button>
            <button onClick={saveProduct} disabled={saving} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold ${s.btnPrimary} disabled:opacity-50 shadow-sm`}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} {editProd ? "Guardar" : "Criar Produto"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
