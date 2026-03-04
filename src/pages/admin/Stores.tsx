import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import Modal from "@/components/admin/Modal";
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Store, Search, CheckCircle2, XCircle, Clock,
  Trash2, Edit3, MapPin, Plus, Loader2, Upload, Image as ImageIcon, ExternalLink, Eye,
  Calendar, Hash, Phone, Star, Package, User, ShieldX, Ban, AlertTriangle,
  BadgeCheck, ToggleLeft, ToggleRight, Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToastNotification } from "@/contexts/ToastContext";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

interface StoreItem {
  id: number; name: string; slug: string; description: string; logo: string; banner?: string;
  province: string; city: string; whatsapp: string; rating: string; review_count: number;
  status: string; is_official: boolean; is_featured: boolean; categories: string[]; products_count?: number; user?: { id: number; name: string }; created_at: string;
}

const emptyForm = { name: "", slug: "", description: "", province: "", city: "", whatsapp: "", status: "pending" };

export default function AdminStores() {
  const { token } = useAuth();
  const s = useAdminStyles();
  const navigate = useNavigate();
  const toast = useToastNotification();
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editStore, setEditStore] = useState<StoreItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [detailStore, setDetailStore] = useState<StoreItem | null>(null);
  const [banModal, setBanModal] = useState<StoreItem | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banning, setBanning] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  const fetchStores = () => {
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams({ per_page: "10", page: String(page) });
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    fetch(`${API}/admin/stores?${params}&_t=${Date.now()}`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Cache-Control": "no-cache" } })
      .then((r) => r.json())
      .then((data) => { setStores(data.data || []); setTotalPages(data.last_page || 1); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStores(); }, [token, page, statusFilter]);
  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchStores(); };

  const openCreate = () => { setEditStore(null); setForm(emptyForm); setLogoFile(null); setBannerFile(null); setLogoPreview(""); setFormError(""); setModalOpen(true); };
  const openEdit = (st: StoreItem) => {
    setEditStore(st);
    setForm({ name: st.name, slug: st.slug, description: st.description, province: st.province, city: st.city, whatsapp: st.whatsapp || "", status: st.status });
    setLogoFile(null); setBannerFile(null); setLogoPreview(st.logo || ""); setFormError(""); setModalOpen(true);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setLogoFile(file); setLogoPreview(URL.createObjectURL(file)); }
  };

  const saveStore = async () => {
    if (!form.name || !form.slug) { setFormError("Nome e slug sao obrigatorios."); return; }
    if (!editStore && !logoFile) { setFormError("Logo e obrigatorio."); return; }
    setSaving(true); setFormError("");

    const fd = new FormData();
    fd.append("name", form.name);
    fd.append("slug", form.slug);
    fd.append("description", form.description);
    fd.append("province", form.province);
    fd.append("city", form.city);
    fd.append("whatsapp", form.whatsapp);
    fd.append("status", form.status);
    if (logoFile) fd.append("logo", logoFile);
    if (bannerFile) fd.append("banner", bannerFile);

    const url = editStore ? `${API}/admin/stores/${editStore.id}` : `${API}/admin/stores`;
    // FormData + PUT requires POST with _method
    if (editStore) fd.append("_method", "PUT");

    try {
      const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, body: fd });
      const data = await res.json();
      if (!res.ok) { setFormError(data.errors ? (Object.values(data.errors).flat().join(", ") as string) : data.message || "Erro"); toast.error("Erro", "Nao foi possivel guardar a loja."); }
      else { setModalOpen(false); fetchStores(); toast.success(editStore ? "Loja actualizada" : "Loja criada", `"${form.name}" guardada com sucesso.`); }
    } finally { setSaving(false); }
  };

  const updateStatus = async (id: number, status: string) => {
    setActionLoading(id);
    const res = await fetch(`${API}/admin/stores/${id}/${status === "approved" ? "approve" : "reject"}`, { method: "PATCH", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    setActionLoading(null); fetchStores();
    if (res.ok) toast.update(status === "approved" ? "Loja aprovada" : "Loja rejeitada");
    else toast.error("Erro", "Nao foi possivel actualizar o estado.");
  };

  const banStore = async () => {
    if (!banModal || !banReason.trim()) return;
    setBanning(true);
    try {
      const res = await fetch(`${API}/admin/stores/${banModal.id}/ban`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ reason: banReason }),
      });
      if (res.ok) { toast.success("Loja banida", `"${banModal.name}" foi suspensa.`); setBanModal(null); setBanReason(""); fetchStores(); }
      else toast.error("Erro", "Nao foi possivel banir a loja.");
    } finally { setBanning(false); }
  };

  const toggleFeatured = async (st: StoreItem) => {
    setActionLoading(st.id);
    try {
      const res = await fetch(`${API}/admin/stores/${st.id}/toggle-featured`, {
        method: "PATCH", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.is_featured ? "Em Destaque" : "Removido Destaque", data.message);
        fetchStores();
        if (detailStore?.id === st.id) setDetailStore({ ...st, is_featured: data.is_featured });
      } else toast.error("Erro", "Nao foi possivel alterar destaque.");
    } finally { setActionLoading(null); }
  };

  const toggleOfficial = async (st: StoreItem) => {
    setActionLoading(st.id);
    try {
      const res = await fetch(`${API}/admin/stores/${st.id}/toggle-official`, {
        method: "PATCH", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.is_official ? "Loja Oficial" : "Removido Oficial", data.message);
        fetchStores();
        if (detailStore?.id === st.id) setDetailStore({ ...st, is_official: data.is_official });
      } else toast.error("Erro", "Nao foi possivel alterar estado oficial.");
    } finally { setActionLoading(null); }
  };

  const deleteStore = async (id: number, name: string) => {
    if (!confirm(`Eliminar "${name}"?`)) return;
    setActionLoading(id);
    const res = await fetch(`${API}/admin/stores/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    setActionLoading(null); fetchStores();
    if (res.ok) toast.success("Loja eliminada", `"${name}" foi removida.`);
    else toast.error("Erro", "Nao foi possivel eliminar a loja.");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className={`text-lg font-bold ${s.textPrimary}`}>Gestao de Lojas</h2>
          <p className={`text-xs ${s.textMuted}`}>{stores.length} lojas</p>
        </div>
        <button onClick={openCreate} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${s.btnPrimary} text-xs font-semibold shadow-sm`}>
          <Plus className="h-4 w-4" /> Nova Loja
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${s.textMuted}`} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar lojas..."
              className={`w-full ${s.input} border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20`} />
          </div>
        </form>
        <div className="flex gap-2 flex-wrap">
          {[{ v: "", l: "Todas" }, { v: "pending", l: "Pendentes" }, { v: "approved", l: "Aprovadas" }, { v: "rejected", l: "Rejeitadas" }, { v: "banned", l: "Banidas" }].map((f) => (
            <button key={f.v} onClick={() => { setStatusFilter(f.v); setPage(1); }}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${statusFilter === f.v ? "bg-orange-500 text-white shadow-sm" : s.btnSecondary}`}>{f.l}</button>
          ))}
        </div>
      </div>

      <div className={`rounded-2xl border ${s.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${s.borderLight}`}>
                {["Loja", "Localizacao", "Dono", "Status", "Produtos", "Accoes"].map((h, i) => (
                  <th key={h} className={`text-left text-[10px] font-semibold ${s.thText} uppercase tracking-wider px-5 py-3 ${i === 1 ? "hidden md:table-cell" : ""} ${i === 2 || i === 4 ? "hidden lg:table-cell" : ""} ${i === 5 ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${s.borderLight}`}>
              {loading ? [...Array(5)].map((_, i) => <tr key={i}><td colSpan={6} className="px-5 py-4"><div className={`h-4 ${s.skeleton} rounded animate-pulse`} /></td></tr>)
              : stores.length === 0 ? <tr><td colSpan={6} className="text-center py-12"><Store className={`h-10 w-10 ${s.empty} mx-auto mb-2`} /><p className={`text-xs ${s.textMuted}`}>Nenhuma loja</p></td></tr>
              : stores.map((st) => (
                <motion.tr key={st.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`${s.hoverRow} transition-colors group`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {st.logo ? <img src={st.logo} alt="" className="h-9 w-9 rounded-xl object-cover bg-gray-100" />
                        : <div className={`h-9 w-9 rounded-xl ${s.isDark ? "bg-white/5" : "bg-gray-100"} flex items-center justify-center`}><Store className={`h-4 w-4 ${s.textMuted}`} /></div>}
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold ${s.textPrimary} truncate max-w-[200px] flex items-center gap-1`}>{st.name}{st.is_official && <BadgeCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />}{st.is_featured && <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />}</p>
                        <p className={`text-[10px] ${s.textMuted} truncate max-w-[200px]`}>{st.categories?.slice(0, 2).join(", ")}</p>
                      </div>
                    </div>
                  </td>
                  <td className={`px-5 py-3 hidden md:table-cell`}>
                    <div className={`flex items-center gap-1 text-xs ${s.textSecondary}`}><MapPin className="h-3 w-3" /> {st.province}, {st.city}</div>
                  </td>
                  <td className={`px-5 py-3 hidden lg:table-cell text-xs ${s.textSecondary}`}>{st.user?.name || "—"}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.status === "approved" ? s.badge("green") : st.status === "pending" ? s.badge("amber") : st.status === "banned" ? s.badge("red") : s.badge("red")}`}>
                      {st.status === "approved" ? <><CheckCircle2 className="h-3 w-3" /> Aprovada</> : st.status === "pending" ? <><Clock className="h-3 w-3" /> Pendente</> : st.status === "banned" ? <><ShieldX className="h-3 w-3" /> Banida</> : <><XCircle className="h-3 w-3" /> Rejeitada</>}
                    </span>
                  </td>
                  <td className={`px-5 py-3 hidden lg:table-cell text-xs ${s.textSecondary}`}>{st.products_count ?? "—"}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setDetailStore(st)} className={`p-1.5 rounded-lg ${s.textMuted} hover:text-cyan-500 transition-colors`} title="Ver Detalhes"><Eye className="h-4 w-4" /></button>
                      <button onClick={() => navigate(`/loja/${st.slug}/painel`)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors" title="Entrar na Loja"><ExternalLink className="h-4 w-4" /></button>
                      <button onClick={() => openEdit(st)} className={`p-1.5 rounded-lg ${s.textMuted} hover:text-orange-500 transition-colors`} title="Editar"><Edit3 className="h-4 w-4" /></button>
                      {st.status !== "approved" && <button onClick={() => updateStatus(st.id, "approved")} disabled={actionLoading === st.id} className="p-1.5 rounded-lg text-green-500 hover:bg-green-50 transition-colors disabled:opacity-50" title="Aprovar">{actionLoading === st.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}</button>}
                      {st.status !== "rejected" && st.status !== "banned" && <button onClick={() => updateStatus(st.id, "rejected")} disabled={actionLoading === st.id} className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 transition-colors disabled:opacity-50" title="Rejeitar">{actionLoading === st.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}</button>}
                      {st.status !== "banned" && <button onClick={() => { setBanReason(""); setBanModal(st); }} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors" title="Banir Loja"><Ban className="h-4 w-4" /></button>}
                      <button onClick={() => deleteStore(st.id, st.name)} disabled={actionLoading === st.id} className={`p-1.5 rounded-lg ${s.textMuted} hover:text-red-500 transition-colors disabled:opacity-50`} title="Eliminar">{actionLoading === st.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button>
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
      <Modal open={!!detailStore} onClose={() => setDetailStore(null)} title="Detalhes da Loja" size="xl">
        {detailStore && (
          <div className="space-y-5">
            {/* Banner + Logo */}
            <div className="relative">
              <div className={`w-full h-32 rounded-xl overflow-hidden ${s.isDark ? "bg-white/5" : "bg-gray-100"}`}>
                {detailStore.banner ? <img src={detailStore.banner} alt="" className="w-full h-full object-cover" />
                  : detailStore.logo ? <img src={detailStore.logo} alt="" className="w-full h-full object-cover opacity-30 blur-sm" /> : null}
              </div>
              <div className="absolute -bottom-6 left-5">
                <div className={`h-16 w-16 rounded-xl border-4 ${s.isDark ? "border-[#1a1c23]" : "border-white"} overflow-hidden shadow-lg`}>
                  {detailStore.logo ? <img src={detailStore.logo} alt="" className="h-full w-full object-cover" />
                    : <div className={`h-full w-full ${s.isDark ? "bg-white/10" : "bg-gray-200"} flex items-center justify-center`}><Store className={`h-6 w-6 ${s.textMuted}`} /></div>}
                </div>
              </div>
            </div>

            <div className="pt-4">
              {/* Name + Status */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`text-lg font-bold ${s.textPrimary} flex items-center gap-1.5`}>
                      {detailStore.name}
                      {detailStore.is_official && <BadgeCheck className="h-5 w-5 text-blue-500" />}
                    </h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${detailStore.status === "approved" ? s.badge("green") : detailStore.status === "pending" ? s.badge("amber") : s.badge("red")}`}>
                      {detailStore.status === "approved" ? "Aprovada" : detailStore.status === "pending" ? "Pendente" : detailStore.status === "banned" ? "Banida" : "Rejeitada"}
                    </span>
                  </div>
                  <p className={`text-xs ${s.textMuted} mt-0.5`}>/{detailStore.slug}</p>
                </div>
                <div className="flex flex-col gap-2">
                  {/* Official Toggle */}
                  <button
                    onClick={() => toggleOfficial(detailStore)}
                    disabled={actionLoading === detailStore.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      detailStore.is_official
                        ? s.isDark ? "bg-blue-500/15 text-blue-400 hover:bg-blue-500/25" : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                        : s.isDark ? "bg-white/5 text-white/40 hover:bg-white/10" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                    } disabled:opacity-50`}
                  >
                    {detailStore.is_official ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                    {detailStore.is_official ? "Loja Oficial" : "Marcar Oficial"}
                  </button>
                  {/* Featured Toggle */}
                  <button
                    onClick={() => toggleFeatured(detailStore)}
                    disabled={actionLoading === detailStore.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      detailStore.is_featured
                        ? s.isDark ? "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25" : "bg-amber-50 text-amber-600 hover:bg-amber-100"
                        : s.isDark ? "bg-white/5 text-white/40 hover:bg-white/10" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                    } disabled:opacity-50`}
                  >
                    {detailStore.is_featured ? <Sparkles className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                    {detailStore.is_featured ? "Em Destaque" : "Colocar Destaque"}
                  </button>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className={`rounded-xl p-3 ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}>
                  <p className={`text-[10px] ${s.textMuted} uppercase tracking-wider`}>Produtos</p>
                  <p className={`text-sm font-bold ${s.textPrimary} mt-0.5 flex items-center gap-1`}><Package className="h-3.5 w-3.5" /> {detailStore.products_count ?? 0}</p>
                </div>
                <div className={`rounded-xl p-3 ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}>
                  <p className={`text-[10px] ${s.textMuted} uppercase tracking-wider`}>Avaliacao</p>
                  <p className={`text-sm font-bold ${s.textPrimary} mt-0.5 flex items-center gap-1`}><Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" /> {parseFloat(detailStore.rating || "0").toFixed(1)} ({detailStore.review_count})</p>
                </div>
                <div className={`rounded-xl p-3 ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}>
                  <p className={`text-[10px] ${s.textMuted} uppercase tracking-wider`}>Localizacao</p>
                  <p className={`text-xs font-semibold ${s.textPrimary} mt-0.5 flex items-center gap-1`}><MapPin className="h-3 w-3" /> {detailStore.city}, {detailStore.province}</p>
                </div>
                <div className={`rounded-xl p-3 ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}>
                  <p className={`text-[10px] ${s.textMuted} uppercase tracking-wider`}>WhatsApp</p>
                  <p className={`text-xs font-semibold ${s.textPrimary} mt-0.5 flex items-center gap-1`}><Phone className="h-3 w-3" /> {detailStore.whatsapp || "\u2014"}</p>
                </div>
              </div>

              {/* Owner + Meta */}
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className={`rounded-xl p-3 ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}>
                  <p className={`text-[10px] ${s.textMuted} uppercase tracking-wider`}>Proprietario</p>
                  <p className={`text-xs font-semibold ${s.textPrimary} mt-0.5 flex items-center gap-1`}><User className="h-3 w-3" /> {detailStore.user?.name || "\u2014"}</p>
                </div>
                <div className={`rounded-xl p-3 ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}>
                  <p className={`text-[10px] ${s.textMuted} uppercase tracking-wider`}>Categorias</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(detailStore.categories || []).length > 0 ? detailStore.categories.map((c: string, i: number) => (
                      <span key={i} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${s.badge("purple")}`}>{c}</span>
                    )) : <span className={`text-xs ${s.textMuted}`}>\u2014</span>}
                  </div>
                </div>
              </div>

              {/* Description */}
              {detailStore.description && (
                <div className={`rounded-xl p-4 mt-3 ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}>
                  <p className={`text-[10px] ${s.textMuted} uppercase tracking-wider mb-1.5`}>Descricao</p>
                  <p className={`text-sm ${s.textSecondary} whitespace-pre-line`}>{detailStore.description}</p>
                </div>
              )}

              {/* Meta */}
              <div className={`flex items-center gap-4 text-[11px] ${s.textMuted} mt-3`}>
                <span className="flex items-center gap-1"><Hash className="h-3 w-3" /> ID: {detailStore.id}</span>
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(detailStore.created_at).toLocaleDateString("pt-AO")}</span>
              </div>

              {/* Actions */}
              <div className={`flex justify-end gap-2 pt-3 mt-3 border-t ${s.borderLight}`}>
                <button onClick={() => navigate(`/lojas/${detailStore.slug}`)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium ${s.btnSecondary}`}>
                  <Eye className="h-3.5 w-3.5" /> Ver na Loja
                </button>
                <button onClick={() => navigate(`/loja/${detailStore.slug}/painel`)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors">
                  <ExternalLink className="h-3.5 w-3.5" /> Painel da Loja
                </button>
                <button onClick={() => { setDetailStore(null); openEdit(detailStore); }} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold ${s.btnPrimary} shadow-sm`}>
                  <Edit3 className="h-3.5 w-3.5" /> Editar
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Ban Modal */}
      <Modal open={!!banModal} onClose={() => setBanModal(null)} title="Banir Loja" size="md">
        {banModal && (
          <div className="space-y-4">
            <div className={`flex items-center gap-3 p-4 rounded-xl ${s.isDark ? "bg-red-500/10" : "bg-red-50"} border ${s.isDark ? "border-red-500/20" : "border-red-200"}`}>
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
              <div>
                <p className={`text-sm font-semibold ${s.textPrimary}`}>Tem a certeza que quer banir esta loja?</p>
                <p className={`text-xs ${s.textSecondary} mt-0.5`}>A loja <strong>"{banModal.name}"</strong> sera suspensa e o proprietario sera notificado por email.</p>
              </div>
            </div>
            <div>
              <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Motivo da suspensao <span className="text-red-500">*</span></label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                rows={4}
                placeholder="Descreva o motivo detalhado da suspensao da loja..."
                className={`w-full ${s.input} border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 resize-none`}
              />
              <p className={`text-[10px] ${s.textMuted} mt-1`}>Este motivo sera enviado ao proprietario da loja por email.</p>
            </div>
            <div className={`flex justify-end gap-2 pt-2 border-t ${s.borderLight}`}>
              <button onClick={() => setBanModal(null)} className={`px-4 py-2.5 rounded-xl text-xs font-medium ${s.btnSecondary}`}>Cancelar</button>
              <button onClick={banStore} disabled={banning || !banReason.trim()} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 shadow-sm">
                {banning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />} Confirmar Banimento
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editStore ? "Editar Loja" : "Nova Loja"} size="lg">
        <div className="space-y-4">
          {formError && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">{formError}</div>}

          {/* Logo upload */}
          <div>
            <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Logo {!editStore && <span className="text-red-500">*</span>}</label>
            <div className="flex items-center gap-4">
              <div onClick={() => logoRef.current?.click()}
                className={`h-20 w-20 rounded-xl border-2 border-dashed ${s.isDark ? "border-white/10 hover:border-white/20" : "border-gray-300 hover:border-orange-400"} flex items-center justify-center cursor-pointer transition-colors overflow-hidden`}>
                {logoPreview ? <img src={logoPreview} alt="" className="h-full w-full object-cover" />
                  : <Upload className={`h-6 w-6 ${s.textMuted}`} />}
              </div>
              <div className={`text-xs ${s.textMuted}`}>
                <p>Clique para seleccionar</p>
                <p>JPG, PNG ate 2MB</p>
              </div>
              <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </div>
          </div>

          {/* Banner upload */}
          <div>
            <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Banner (opcional)</label>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => bannerRef.current?.click()}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs ${s.btnSecondary}`}>
                <ImageIcon className="h-4 w-4" /> {bannerFile ? bannerFile.name : "Seleccionar banner"}
              </button>
              <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setBannerFile(e.target.files[0]); }} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { l: "Nome", k: "name", p: "Nome da loja", req: true },
              { l: "Slug", k: "slug", p: "nome-da-loja", req: true },
              { l: "Provincia", k: "province", p: "Luanda", req: true },
              { l: "Cidade", k: "city", p: "Luanda", req: true },
              { l: "WhatsApp", k: "whatsapp", p: "+244 9XX XXX XXX", req: true },
            ].map((f) => (
              <div key={f.k}>
                <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>{f.l} {f.req && <span className="text-red-500">*</span>}</label>
                <input value={(form as any)[f.k]} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} placeholder={f.p}
                  className={`w-full ${s.input} border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20`} />
              </div>
            ))}
            <div>
              <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className={`w-full ${s.input} border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20`}>
                <option value="pending">Pendente</option>
                <option value="approved">Aprovada</option>
                <option value="rejected">Rejeitada</option>
              </select>
            </div>
          </div>
          <div>
            <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Descricao <span className="text-red-500">*</span></label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Descricao da loja..."
              className={`w-full ${s.input} border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 resize-none`} />
          </div>
          <div className={`flex justify-end gap-2 pt-2 border-t ${s.borderLight}`}>
            <button onClick={() => setModalOpen(false)} className={`px-4 py-2.5 rounded-xl text-xs font-medium ${s.btnSecondary}`}>Cancelar</button>
            <button onClick={saveStore} disabled={saving} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold ${s.btnPrimary} disabled:opacity-50 shadow-sm`}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} {editStore ? "Guardar" : "Criar Loja"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
