import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import Modal from "@/components/admin/Modal";
import { useEffect, useState, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { Package, Search, Trash2, Edit3, Plus, Loader2, Upload, X, Image as ImageIcon, Tag, Star } from "lucide-react";
import { useToastNotification } from "@/contexts/ToastContext";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

interface SubcategoryItem { id: number; category_id: number; name: string; slug: string; }
interface CategoryItem { id: number; name: string; slug: string; icon: string; subcategories?: SubcategoryItem[]; }

interface ProductItem {
  id: number; name: string; slug: string; price: number; original_price: number | null;
  images: string[]; category: string; category_id: number | null; subcategory_id: number | null; badge: string | null; rating: string;
  stock: number; description: string; created_at: string;
}

const emptyForm = { name: "", slug: "", price: "", original_price: "", stock: "", category: "", category_id: "", subcategory_id: "", badge: "", description: "" };

export default function StorePanelProducts() {
  const { token } = useAuth();
  const s = useAdminStyles();
  const { slug } = useOutletContext<{ slug: string }>();
  const toast = useToastNotification();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editProd, setEditProd] = useState<ProductItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  // Fetch categories for dropdown
  useEffect(() => {
    fetch(`${API}/categories`, { headers: { Accept: "application/json" } })
      .then(r => r.json()).then(d => setCategories(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const currentSubcategories = categories.find(c => String(c.id) === form.category_id)?.subcategories || [];

  const fetchProducts = () => {
    if (!token || !slug) return;
    setLoading(true);
    const params = new URLSearchParams({ per_page: "12", page: String(page) });
    if (search) params.set("search", search);
    fetch(`${API}/store-panel/${slug}/products?${params}`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } })
      .then((r) => r.json())
      .then((data) => { setProducts(data.data || []); setTotalPages(data.last_page || 1); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProducts(); }, [token, slug, page]);
  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchProducts(); };

  const openCreate = () => { setEditProd(null); setForm(emptyForm); setImageFiles([]); setImagePreviews([]); setExistingImages([]); setFormError(""); setModalOpen(true); };
  const openEdit = (p: ProductItem) => {
    setEditProd(p);
    setForm({ name: p.name, slug: p.slug, price: String(p.price), original_price: p.original_price ? String(p.original_price) : "", stock: String(p.stock), category: p.category, category_id: p.category_id ? String(p.category_id) : "", subcategory_id: p.subcategory_id ? String(p.subcategory_id) : "", badge: p.badge || "", description: p.description || "" });
    setImageFiles([]); setImagePreviews([]); setExistingImages(p.images || []); setFormError(""); setModalOpen(true);
  };

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImageFiles((prev) => [...prev, ...files]);
    setImagePreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
    if (imgRef.current) imgRef.current.value = "";
  };

  const saveProduct = async () => {
    if (!form.name || !form.slug || !form.price || (!form.category && !form.category_id) || !form.description) { setFormError("Preencha todos os campos obrigatorios."); return; }
    if (!editProd && imageFiles.length === 0) { setFormError("Pelo menos uma imagem e obrigatoria."); return; }
    setSaving(true); setFormError("");

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
    fd.append("description", form.description);

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
      if (!res.ok) { setFormError(data.errors ? (Object.values(data.errors).flat().join(", ") as string) : data.message || "Erro"); toast.error("Erro", "Nao foi possivel guardar o produto."); }
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
          <p className={`text-xs ${s.textMuted}`}>Gerir produtos da sua loja</p>
        </div>
        <button onClick={openCreate} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${s.btnPrimary} text-xs font-semibold shadow-sm`}>
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
                      {p.images?.[0] ? <img src={p.images[0]} alt="" className="h-10 w-10 rounded-xl object-cover" />
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
            <div className="flex flex-wrap gap-2">
              {existingImages.map((img, i) => (
                <div key={`ex-${i}`} className="relative h-16 w-16 rounded-lg overflow-hidden border">
                  <img src={img} alt="" className="h-full w-full object-cover" />
                  <button onClick={() => setExistingImages((prev) => prev.filter((_, j) => j !== i))} className="absolute top-0 right-0 bg-red-500 text-white rounded-bl p-0.5"><X className="h-3 w-3" /></button>
                </div>
              ))}
              {imagePreviews.map((prev, i) => (
                <div key={`new-${i}`} className="relative h-16 w-16 rounded-lg overflow-hidden border border-emerald-300">
                  <img src={prev} alt="" className="h-full w-full object-cover" />
                  <button onClick={() => { setImageFiles((p) => p.filter((_, j) => j !== i)); setImagePreviews((p) => p.filter((_, j) => j !== i)); }} className="absolute top-0 right-0 bg-red-500 text-white rounded-bl p-0.5"><X className="h-3 w-3" /></button>
                </div>
              ))}
              <button type="button" onClick={() => imgRef.current?.click()}
                className={`h-16 w-16 rounded-lg border-2 border-dashed ${s.isDark ? "border-white/10" : "border-gray-300 hover:border-emerald-400"} flex items-center justify-center cursor-pointer transition-colors`}>
                <Upload className={`h-5 w-5 ${s.textMuted}`} />
              </button>
              <input ref={imgRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageAdd} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { l: "Nome", k: "name", p: "Nome do produto", req: true },
              { l: "Slug", k: "slug", p: "nome-do-produto", req: true },
              { l: "Preco (Kz)", k: "price", p: "15000", req: true, type: "number" },
              { l: "Preco Original", k: "original_price", p: "20000", type: "number" },
              { l: "Stock", k: "stock", p: "100", type: "number" },
            ].map((f) => (
              <div key={f.k}>
                <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>{f.l} {f.req && <span className="text-red-500">*</span>}</label>
                <input type={f.type || "text"} value={(form as any)[f.k]} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} placeholder={f.p}
                  className={`w-full ${s.input} border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20`} />
              </div>
            ))}
            {/* Categoria dropdown */}
            <div>
              <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Categoria <span className="text-red-500">*</span></label>
              <select value={form.category_id} onChange={(e) => {
                const catId = e.target.value;
                const cat = categories.find(c => String(c.id) === catId);
                setForm({ ...form, category_id: catId, category: cat?.name || "", subcategory_id: "" });
              }} className={`w-full ${s.input} border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20`}>
                <option value="">Seleccionar categoria...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
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
                <option value="Promo">Promo</option>
              </select>
            </div>
          </div>
          <div>
            <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Descricao <span className="text-red-500">*</span></label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Descricao do produto..."
              className={`w-full ${s.input} border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none`} />
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
