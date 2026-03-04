import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import Modal from "@/components/admin/Modal";
import { useEffect, useState, useRef, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { Package, Search, Trash2, Edit3, Plus, Loader2, Upload, X, Image as ImageIcon, Tag, Star as StarIcon, CheckCircle2, AlertCircle, Clock, Layers } from "lucide-react";
import { useToastNotification } from "@/contexts/ToastContext";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";
const BASE = API.replace(/\/api\/?$/, "");
const imgUrl = (src: string) => src.startsWith("/storage") ? `${BASE}${src}` : src;

interface SubcategoryItem { id: number; category_id: number; name: string; slug: string; }
interface CategoryItem { id: number; name: string; slug: string; icon: string; subcategories?: SubcategoryItem[]; }

interface ProductItem {
  id: number; name: string; slug: string; price: number; original_price: number | null;
  images: string[]; category: string; category_id: number | null; subcategory_id: number | null; badge: string | null; rating: string;
  stock: number; description: string; created_at: string;
  variants: { type: string; options: string[] }[] | null;
  flash_sale_start: string | null; flash_sale_end: string | null;
}

const emptyForm = { name: "", slug: "", price: "", original_price: "", stock: "", category: "", category_id: "", subcategory_id: "", badge: "", description: "" };

function slugify(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function titleCase(text: string): string {
  return text.replace(/\b\w+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

type FieldErrors = Record<string, string>;

export default function StorePanelProducts() {
  const { token } = useAuth();
  const s = useAdminStyles();
  const { slug, storeInfo } = useOutletContext<{ slug: string; storeInfo?: { categories?: (string | number)[]; plan?: { max_products: number; max_images_per_product: number; max_hero_slides: number; name: string } | null } }>();
  const toast = useToastNotification();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editProd, setEditProd] = useState<ProductItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const [slugManual, setSlugManual] = useState(false);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [slugSuggestion, setSlugSuggestion] = useState<string | null>(null);
  const slugTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Variants state
  const [variants, setVariants] = useState<{ type: string; options: string[] }[]>([]);
  const [newVariantType, setNewVariantType] = useState("");
  const [newOptionInputs, setNewOptionInputs] = useState<Record<number, string>>({});

  // Flash sale state
  const [flashSaleStart, setFlashSaleStart] = useState("");
  const [flashSaleEnd, setFlashSaleEnd] = useState("");

  const [allCategories, setAllCategories] = useState<CategoryItem[]>([]);

  // Fetch categories for dropdown
  useEffect(() => {
    fetch(`${API}/categories`, { headers: { Accept: "application/json" } })
      .then(r => r.json()).then(d => setAllCategories(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  // Filter categories to only the store's registered categories
  const storeCatIds = Array.isArray(storeInfo?.categories) ? storeInfo.categories : [];
  const storeCategories = storeCatIds.length
    ? allCategories.filter(c => storeCatIds.map(String).includes(String(c.id)))
    : allCategories;

  // Auto-select category if store only has one
  useEffect(() => {
    if (storeCategories.length === 1 && !form.category_id) {
      setForm(f => ({ ...f, category_id: String(storeCategories[0].id), category: storeCategories[0].name }));
    }
  }, [storeCategories, form.category_id]);

  const currentSubcategories = allCategories.find(c => String(c.id) === form.category_id)?.subcategories || [];

  const fetchProducts = () => {
    if (!token || !slug) return;
    setLoading(true);
    const params = new URLSearchParams({ per_page: "12", page: String(page) });
    if (search) params.set("search", search);
    fetch(`${API}/store-panel/${slug}/products?${params}`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } })
      .then((r) => r.json())
      .then((data) => { setProducts(data.data || []); setTotalPages(data.last_page || 1); setTotalProducts(data.total || 0); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProducts(); }, [token, slug, page]);
  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchProducts(); };

  const plan = storeInfo?.plan;
  const maxProducts = plan?.max_products ?? 0; // 0 = unlimited
  const maxImages = plan?.max_images_per_product ?? 5;
  const isAtProductLimit = maxProducts > 0 && totalProducts >= maxProducts;

  const openCreate = () => {
    if (isAtProductLimit) {
      toast.error("Limite atingido", `O seu plano (${plan?.name}) permite no maximo ${maxProducts} produto(s). Faca upgrade para adicionar mais.`);
      return;
    }
    setEditProd(null); setForm(emptyForm); setImageFiles([]); setImagePreviews([]); setExistingImages([]); setFormError(""); setFieldErrors({}); setSlugManual(false); setSlugStatus("idle"); setSlugSuggestion(null); setVariants([]); setNewVariantType(""); setNewOptionInputs({}); setFlashSaleStart(""); setFlashSaleEnd(""); setModalOpen(true);
  };
  const openEdit = (p: ProductItem) => {
    setEditProd(p);
    setForm({ name: p.name, slug: p.slug, price: String(p.price), original_price: p.original_price ? String(p.original_price) : "", stock: String(p.stock), category: p.category, category_id: p.category_id ? String(p.category_id) : "", subcategory_id: p.subcategory_id ? String(p.subcategory_id) : "", badge: p.badge || "", description: p.description || "" });
    setImageFiles([]); setImagePreviews([]); setExistingImages(p.images || []); setFormError(""); setFieldErrors({}); setSlugManual(true); setSlugStatus("idle"); setSlugSuggestion(null);
    setVariants(Array.isArray(p.variants) ? p.variants : []); setNewVariantType(""); setNewOptionInputs({});
    setFlashSaleStart(p.flash_sale_start ? p.flash_sale_start.slice(0, 16) : ""); setFlashSaleEnd(p.flash_sale_end ? p.flash_sale_end.slice(0, 16) : "");
    setModalOpen(true);
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
    fetch(`${API}/store-panel/${slug}/products/check-slug?${params}`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } })
      .then(r => { if (!r.ok) throw new Error('request failed'); return r.json(); })
      .then(d => { setSlugStatus(d.available ? "available" : "taken"); if (d.suggestion) setSlugSuggestion(d.suggestion); })
      .catch(() => setSlugStatus("idle"));
  }, [token, slug]);

  useEffect(() => {
    if (!modalOpen || !form.slug) { setSlugStatus("idle"); return; }
    if (slugTimerRef.current) clearTimeout(slugTimerRef.current);
    slugTimerRef.current = setTimeout(() => checkSlugAvailability(form.slug, editProd?.id), 400);
    return () => { if (slugTimerRef.current) clearTimeout(slugTimerRef.current); };
  }, [form.slug, modalOpen, editProd, checkSlugAvailability]);

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const currentTotal = existingImages.length + imagePreviews.length;
    const allowed = maxImages > 0 ? Math.max(0, maxImages - currentTotal) : files.length;
    if (allowed === 0) {
      toast.error("Limite de imagens", `O seu plano permite no maximo ${maxImages} imagem(ns) por produto.`);
      if (imgRef.current) imgRef.current.value = "";
      return;
    }
    const toAdd = files.slice(0, allowed);
    if (toAdd.length < files.length) {
      toast.error("Limite de imagens", `Apenas ${allowed} imagem(ns) podem ser adicionadas. Maximo: ${maxImages}.`);
    }
    setImageFiles((prev) => [...prev, ...toAdd]);
    setImagePreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);
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
      setExistingImages((prev) => { const n = [...prev]; const [img] = n.splice(combinedIdx, 1); return [img, ...n]; });
    } else {
      const newIdx = combinedIdx - existingImages.length;
      setImageFiles((prev) => { const n = [...prev]; const [f] = n.splice(newIdx, 1); return [f, ...n]; });
      setImagePreviews((prev) => { const n = [...prev]; const [p] = n.splice(newIdx, 1); return [p, ...n]; });
    }
  };

  const saveProduct = async () => {
    const errs: FieldErrors = {};
    if (!form.name) errs.name = "Nome e obrigatorio.";
    if (!form.slug) errs.slug = "Slug e obrigatorio.";
    else if (slugStatus === "taken") errs.slug = "Este slug ja esta em uso.";
    if (!form.price) errs.price = "Preco e obrigatorio.";
    if (!form.category && !form.category_id) errs.category_id = "Seleccione uma categoria.";
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
    if (variants.length > 0) fd.append("variants", JSON.stringify(variants));
    if (form.badge === "Promo") {
      if (flashSaleStart) fd.append("flash_sale_start", flashSaleStart);
      if (flashSaleEnd) fd.append("flash_sale_end", flashSaleEnd);
    }

    if (editProd) {
      fd.append("_method", "PUT");
      existingImages.forEach((img) => fd.append("existing_images[]", img));
      imageFiles.forEach((file) => fd.append("new_images[]", file));
    } else {
      imageFiles.forEach((file) => fd.append("images[]", file));
    }

    const url = editProd ? `${API}/store-panel/${slug}/products/${editProd.id}` : `${API}/store-panel/${slug}/products`;
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
    const res = await fetch(`${API}/store-panel/${slug}/products/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    setActionLoading(null); fetchProducts();
    if (res.ok) toast.success("Produto eliminado", `"${name}" foi removido.`);
    else toast.error("Erro", "Nao foi possivel eliminar o produto.");
  };

  const fmt = (val: number) => new Intl.NumberFormat("pt-AO").format(val);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className={`text-lg font-bold ${s.textPrimary}`}>Meus Produtos</h2>
          <p className={`text-xs ${s.textMuted}`}>
            {maxProducts > 0 ? `${totalProducts}/${maxProducts} produtos (${plan?.name})` : "Gerir produtos da sua loja"}
          </p>
        </div>
        <button onClick={openCreate} disabled={isAtProductLimit} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${s.btnPrimary} text-xs font-semibold shadow-sm disabled:opacity-50`}>
          <Plus className="h-4 w-4" /> Novo Produto
        </button>
      </div>

      <form onSubmit={handleSearch}>
        <div className="relative max-w-md">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${s.textMuted}`} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar produtos..."
            className={`w-full ${s.input} border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20`} />
        </div>
      </form>

      <div className={`rounded-2xl border ${s.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${s.borderLight}`}>
                {["Produto", "Preco", "Categoria", "Stock", "Accoes"].map((h, i) => (
                  <th key={h} className={`text-left text-[10px] font-semibold ${s.thText} uppercase tracking-wider px-5 py-3 ${i >= 2 && i <= 3 ? "hidden lg:table-cell" : ""} ${i === 4 ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${s.borderLight}`}>
              {loading ? [...Array(5)].map((_, i) => <tr key={i}><td colSpan={5} className="px-5 py-4"><div className={`h-4 ${s.skeleton} rounded animate-pulse`} /></td></tr>)
              : products.length === 0 ? <tr><td colSpan={5} className="text-center py-12"><Package className={`h-10 w-10 ${s.empty} mx-auto mb-2`} /><p className={`text-xs ${s.textMuted}`}>Nenhum produto</p></td></tr>
              : products.map((p) => (
                <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`${s.hoverRow} transition-colors`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {p.images?.[0] ? <img src={imgUrl(p.images[0])} alt="" className="h-10 w-10 rounded-xl object-cover" />
                        : <div className={`h-10 w-10 rounded-xl ${s.isDark ? "bg-white/5" : "bg-gray-100"} flex items-center justify-center`}><ImageIcon className={`h-4 w-4 ${s.textMuted}`} /></div>}
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold ${s.textPrimary} truncate max-w-[180px]`}>{p.name}</p>
                        {p.badge && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${p.badge === "Promo" ? s.badge("red") : s.badge("blue")}`}>{p.badge}</span>}
                      </div>
                    </div>
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
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(p)} className={`p-1.5 rounded-lg ${s.textMuted} hover:text-emerald-500 transition-colors`}><Edit3 className="h-4 w-4" /></button>
                      <button onClick={() => deleteProduct(p.id, p.name)} disabled={actionLoading === p.id} className={`p-1.5 rounded-lg ${s.textMuted} hover:text-red-500 transition-colors disabled:opacity-50`}>
                        {actionLoading === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editProd ? "Editar Produto" : "Novo Produto"} size="lg">
        <div className="space-y-4">
          {formError && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">{formError}</div>}
          {/* Images */}
          <div>
            <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Imagens {!editProd && <span className="text-red-500">*</span>}</label>
            {fieldErrors.images && <p className="text-[11px] text-red-500 mb-1">{fieldErrors.images}</p>}
            {totalImages > 1 && <p className={`text-[10px] ${s.textMuted} mb-1`}>Clique numa imagem para a definir como destaque (primeira = destaque)</p>}
            <div className="flex flex-wrap gap-2">
              {existingImages.map((img, i) => {
                const isFeatured = i === 0 && totalImages > 1;
                return (
                  <div key={`ex-${i}`} className={`relative h-16 w-16 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${isFeatured ? "border-emerald-500 ring-2 ring-emerald-500/30" : s.isDark ? "border-white/10 hover:border-emerald-300" : "border-gray-200 hover:border-emerald-300"}`}
                    onClick={() => setFeatured(i)}>
                    <img src={imgUrl(img)} alt="" className="h-full w-full object-cover" />
                    {isFeatured && <span className="absolute bottom-0 left-0 right-0 bg-emerald-500 text-white text-[8px] font-bold text-center leading-tight py-0.5"><StarIcon className="h-2.5 w-2.5 inline fill-white" /> Destaque</span>}
                    <button onClick={(e) => { e.stopPropagation(); removeExistingImage(i); }} className="absolute top-0 right-0 bg-red-500 text-white rounded-bl p-0.5"><X className="h-3 w-3" /></button>
                  </div>
                );
              })}
              {imagePreviews.map((prev, i) => {
                const combinedIdx = existingImages.length + i;
                const isFeatured = combinedIdx === 0 && totalImages > 1;
                return (
                  <div key={`new-${i}`} className={`relative h-16 w-16 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${isFeatured ? "border-emerald-500 ring-2 ring-emerald-500/30" : "border-emerald-200 hover:border-emerald-400"}`}
                    onClick={() => setFeatured(combinedIdx)}>
                    <img src={prev} alt="" className="h-full w-full object-cover" />
                    {isFeatured && <span className="absolute bottom-0 left-0 right-0 bg-emerald-500 text-white text-[8px] font-bold text-center leading-tight py-0.5"><StarIcon className="h-2.5 w-2.5 inline fill-white" /> Destaque</span>}
                    <button onClick={(e) => { e.stopPropagation(); removeNewImage(i); }} className="absolute top-0 right-0 bg-red-500 text-white rounded-bl p-0.5"><X className="h-3 w-3" /></button>
                  </div>
                );
              })}
              <button type="button" onClick={() => imgRef.current?.click()}
                className={`h-16 w-16 rounded-lg border-2 border-dashed ${s.isDark ? "border-white/10" : "border-gray-300 hover:border-emerald-400"} flex items-center justify-center cursor-pointer transition-colors`}>
                <Upload className={`h-5 w-5 ${s.textMuted}`} />
              </button>
              <input ref={imgRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageAdd} />
            </div>
            <p className={`text-[10px] ${s.textMuted} mt-1`}>JPG, PNG ate 4MB cada{maxImages > 0 ? ` — Max ${maxImages} imagem(ns)` : ""}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nome */}
            <div>
              <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Nome <span className="text-red-500">*</span></label>
              <input type="text" value={form.name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Nome do produto"
                className={`w-full ${s.input} border ${fieldErrors.name ? "border-red-400" : ""} rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20`} />
              {fieldErrors.name && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.name}</p>}
            </div>
            {/* Slug */}
            <div>
              <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Slug <span className="text-red-500">*</span></label>
              <div className="relative">
                <input type="text" value={form.slug} onChange={(e) => handleSlugChange(e.target.value)} placeholder="nome-do-produto"
                  className={`w-full ${s.input} border ${fieldErrors.slug ? "border-red-400" : slugStatus === "available" ? "border-green-400" : slugStatus === "taken" ? "border-red-400" : ""} rounded-xl px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20`} />
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
              { l: "Preco Original", k: "original_price", p: "20000", type: "number" },
              { l: "Stock", k: "stock", p: "100", type: "number" },
            ].map((f) => (
              <div key={f.k}>
                <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>{f.l} {f.req && <span className="text-red-500">*</span>}</label>
                <input type={f.type || "text"} value={(form as any)[f.k]} onChange={(e) => { setForm({ ...form, [f.k]: e.target.value }); setFieldErrors(prev => { const n = { ...prev }; delete n[f.k]; return n; }); }} placeholder={f.p}
                  className={`w-full ${s.input} border ${fieldErrors[f.k] ? "border-red-400" : ""} rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20`} />
                {fieldErrors[f.k] && <p className="text-[11px] text-red-500 mt-1">{fieldErrors[f.k]}</p>}
              </div>
            ))}
            {/* Categoria dropdown */}
            <div>
              <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Categoria <span className="text-red-500">*</span></label>
              <select value={form.category_id} onChange={(e) => {
                const catId = e.target.value;
                const cat = allCategories.find(c => String(c.id) === catId);
                setForm({ ...form, category_id: catId, category: cat?.name || "", subcategory_id: "" });
                setFieldErrors(prev => { const n = { ...prev }; delete n.category_id; return n; });
              }} className={`w-full ${s.input} border ${fieldErrors.category_id ? "border-red-400" : ""} rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20`}>
                <option value="">Seleccionar categoria...</option>
                {storeCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
              {fieldErrors.category_id && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.category_id}</p>}
            </div>
            {/* Subcategoria dropdown */}
            <div>
              <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Subcategoria</label>
              <select value={form.subcategory_id} onChange={(e) => setForm({ ...form, subcategory_id: e.target.value })}
                disabled={!form.category_id || currentSubcategories.length === 0}
                className={`w-full ${s.input} border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50`}>
                <option value="">{!form.category_id ? "Seleccione categoria primeiro" : currentSubcategories.length === 0 ? "Sem subcategorias" : "Seleccionar..."}</option>
                {currentSubcategories.map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
              </select>
            </div>
            {/* Badge */}
            <div>
              <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Badge</label>
              <select value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })}
                className={`w-full ${s.input} border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20`}>
                <option value="">Nenhum</option>
                <option value="Novo">Novo</option>
                <option value="Usado">Usado</option>
                <option value="Promo">Promo</option>
              </select>
            </div>
          </div>
          <div>
            <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Descricao</label>
            <textarea value={form.description} onChange={(e) => { setForm({ ...form, description: e.target.value }); setFieldErrors(prev => { const n = { ...prev }; delete n.description; return n; }); }} rows={3} placeholder="Descricao do produto..."
              className={`w-full ${s.input} border ${fieldErrors.description ? "border-red-400" : ""} rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none`} />
            {fieldErrors.description && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.description}</p>}
          </div>

          {/* ── Variants Builder ── */}
          <div className={`rounded-xl border ${s.borderLight} p-4 space-y-3`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-purple-500" />
                <span className={`text-xs font-semibold ${s.textPrimary}`}>Variantes</span>
              </div>
              <span className={`text-[10px] ${s.textMuted}`}>{variants.length > 0 ? `${variants.length} tipo(s)` : "Opcional"}</span>
            </div>

            {variants.map((v, vi) => (
              <div key={vi} className={`rounded-lg border ${s.isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-gray-100 bg-gray-50/50"} p-3 space-y-2`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${s.textPrimary}`}>{v.type}</span>
                  <button type="button" onClick={() => setVariants(prev => prev.filter((_, i) => i !== vi))} className="text-red-400 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {v.options.map((opt, oi) => (
                    <span key={oi} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium ${s.isDark ? "bg-purple-500/10 text-purple-400" : "bg-purple-50 text-purple-700"}`}>
                      {opt}
                      <button type="button" onClick={() => setVariants(prev => prev.map((vr, i) => i === vi ? { ...vr, options: vr.options.filter((_, j) => j !== oi) } : vr))} className="hover:text-red-500"><X className="h-2.5 w-2.5" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={newOptionInputs[vi] || ""} onChange={(e) => setNewOptionInputs(prev => ({ ...prev, [vi]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); const val = (newOptionInputs[vi] || "").trim(); if (val && !v.options.includes(val)) { setVariants(prev => prev.map((vr, i) => i === vi ? { ...vr, options: [...vr.options, val] } : vr)); setNewOptionInputs(prev => ({ ...prev, [vi]: "" })); } }
                    }}
                    placeholder={`Adicionar opcao a ${v.type}...`}
                    className={`flex-1 ${s.input} border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20`} />
                  <button type="button" onClick={() => { const val = (newOptionInputs[vi] || "").trim(); if (val && !v.options.includes(val)) { setVariants(prev => prev.map((vr, i) => i === vi ? { ...vr, options: [...vr.options, val] } : vr)); setNewOptionInputs(prev => ({ ...prev, [vi]: "" })); } }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${s.isDark ? "bg-purple-500/15 text-purple-400 hover:bg-purple-500/25" : "bg-purple-50 text-purple-600 hover:bg-purple-100"}`}>
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}

            <div className="flex gap-2">
              <input type="text" value={newVariantType} onChange={(e) => setNewVariantType(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); const val = newVariantType.trim(); if (val && !variants.some(v => v.type.toLowerCase() === val.toLowerCase())) { setVariants(prev => [...prev, { type: val, options: [] }]); setNewVariantType(""); } }
                }}
                placeholder="Tipo de variante (ex: Cor, Tamanho, Material...)"
                className={`flex-1 ${s.input} border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20`} />
              <button type="button" onClick={() => { const val = newVariantType.trim(); if (val && !variants.some(v => v.type.toLowerCase() === val.toLowerCase())) { setVariants(prev => [...prev, { type: val, options: [] }]); setNewVariantType(""); } }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${s.btnPrimary}`}>
                <Plus className="h-3 w-3" />
              </button>
            </div>
            <p className={`text-[10px] ${s.textMuted}`}>Ex: Cor → Preto, Branco, Azul | Tamanho → S, M, L, XL</p>
          </div>

          {/* ── Flash Sale (when badge = Promo) ── */}
          {form.badge === "Promo" && (
            <div className={`rounded-xl border ${s.isDark ? "border-red-500/20 bg-red-500/5" : "border-red-100 bg-red-50/50"} p-4 space-y-3`}>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-red-500" />
                <span className={`text-xs font-semibold ${s.textPrimary}`}>Temporizador Flash Sale</span>
              </div>
              <p className={`text-[10px] ${s.textMuted}`}>Defina o periodo da promocao. O produto sera removido da Flash Sale automaticamente apos o fim.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[10px] font-medium ${s.textSecondary} mb-1`}>Inicio</label>
                  <input type="datetime-local" value={flashSaleStart} onChange={(e) => setFlashSaleStart(e.target.value)}
                    className={`w-full ${s.input} border rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20`} />
                </div>
                <div>
                  <label className={`block text-[10px] font-medium ${s.textSecondary} mb-1`}>Fim</label>
                  <input type="datetime-local" value={flashSaleEnd} onChange={(e) => setFlashSaleEnd(e.target.value)}
                    min={flashSaleStart || undefined}
                    className={`w-full ${s.input} border rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20`} />
                </div>
              </div>
            </div>
          )}

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
