import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import Modal from "@/components/admin/Modal";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users, Search, ShieldCheck, Store, User, ToggleLeft, ToggleRight,
  Trash2, Plus, Edit3, Loader2, Eye, EyeOff
} from "lucide-react";
import { useToastNotification } from "@/contexts/ToastContext";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

interface UserItem {
  id: number;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  is_active: boolean;
  store?: { id: number; name: string } | null;
  created_at: string;
}

const emptyForm = { name: "", email: "", password: "", role: "customer", phone: "", is_active: true };

export default function AdminUsers() {
  const { token, user: currentUser } = useAuth();
  const s = useAdminStyles();
  const toast = useToastNotification();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const fetchUsers = () => {
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams({ per_page: "15", page: String(page) });
    if (search) params.set("search", search);
    if (roleFilter) params.set("role", roleFilter);
    fetch(`${API}/admin/users?${params}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    })
      .then((r) => r.json())
      .then((data) => { setUsers(data.data || []); setTotalPages(data.last_page || 1); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, [token, page, roleFilter]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchUsers(); };

  const openCreate = () => { setEditUser(null); setForm(emptyForm); setFormError(""); setModalOpen(true); };

  const openEdit = (u: UserItem) => {
    setEditUser(u);
    setForm({ name: u.name, email: u.email, password: "", role: u.role, phone: u.phone || "", is_active: u.is_active });
    setFormError("");
    setModalOpen(true);
  };

  const saveUser = async () => {
    if (!form.name || !form.email) { setFormError("Nome e email sao obrigatorios."); return; }
    if (!editUser && !form.password) { setFormError("Password e obrigatoria para novos utilizadores."); return; }
    setSaving(true);
    setFormError("");
    const body: Record<string, unknown> = { name: form.name, email: form.email, role: form.role, phone: form.phone || null, is_active: form.is_active };
    if (form.password) { body.password = form.password; body.password_confirmation = form.password; }

    const url = editUser ? `${API}/admin/users/${editUser.id}` : `${API}/admin/users`;
    const method = editUser ? "PUT" : "POST";
    try {
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        const err = data.errors ? Object.values(data.errors).flat().join(", ") : data.message || "Erro ao guardar.";
        setFormError(err as string);
        toast.error("Erro", "Nao foi possivel guardar o utilizador.");
      } else {
        setModalOpen(false);
        fetchUsers();
        toast.success(editUser ? "Utilizador actualizado" : "Utilizador criado", `"${form.name}" guardado com sucesso.`);
      }
    } finally { setSaving(false); }
  };

  const toggleActive = async (id: number) => {
    setActionLoading(id);
    const res = await fetch(`${API}/admin/users/${id}/toggle-active`, { method: "PATCH", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    setActionLoading(null);
    fetchUsers();
    if (res.ok) toast.update("Estado actualizado");
    else toast.error("Erro", "Nao foi possivel actualizar o estado.");
  };

  const deleteUser = async (id: number, name: string) => {
    if (!confirm(`Eliminar "${name}"? Esta accao e irreversivel.`)) return;
    setActionLoading(id);
    const res = await fetch(`${API}/admin/users/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    setActionLoading(null);
    fetchUsers();
    if (res.ok) toast.success("Utilizador eliminado", `"${name}" foi removido.`);
    else toast.error("Erro", "Nao foi possivel eliminar o utilizador.");
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const InputField = ({ label, value, onChange, type = "text", placeholder = "", required = false, children }: {
    label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean; children?: React.ReactNode;
  }) => (
    <div>
      <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>{label} {required && <span className="text-red-500">*</span>}</label>
      <div className="relative">
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className={`w-full ${s.input} border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all`} />
        {children}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className={`text-lg font-bold ${s.textPrimary}`}>Gestao de Utilizadores</h2>
          <p className={`text-xs ${s.textMuted}`}>Gerir contas do sistema</p>
        </div>
        <button onClick={openCreate} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${s.btnPrimary} text-xs font-semibold transition-colors shadow-sm`}>
          <Plus className="h-4 w-4" /> Novo Utilizador
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${s.textMuted}`} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar por nome ou email..."
              className={`w-full ${s.input} border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all`} />
          </div>
        </form>
        <div className="flex gap-2 flex-wrap">
          {[{ v: "", l: "Todos" }, { v: "super_admin", l: "Admins" }, { v: "store_owner", l: "Lojistas" }, { v: "customer", l: "Clientes" }].map((f) => (
            <button key={f.v} onClick={() => { setRoleFilter(f.v); setPage(1); }}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${roleFilter === f.v
                ? "bg-orange-500 text-white shadow-sm"
                : s.btnSecondary
              }`}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className={`rounded-2xl border ${s.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${s.borderLight}`}>
                {["Utilizador", "Email", "Role", "Estado", "Registado", "Accoes"].map((h, i) => (
                  <th key={h} className={`text-left text-[10px] font-semibold ${s.thText} uppercase tracking-wider px-5 py-3 ${i === 1 ? "hidden md:table-cell" : ""} ${i === 4 ? "hidden lg:table-cell" : ""} ${i === 5 ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${s.borderLight}`}>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-5 py-4"><div className={`h-4 ${s.skeleton} rounded animate-pulse`} /></td></tr>
                ))
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12">
                  <Users className={`h-10 w-10 ${s.empty} mx-auto mb-2`} />
                  <p className={`text-xs ${s.textMuted}`}>Nenhum utilizador encontrado</p>
                </td></tr>
              ) : (
                users.map((u) => (
                  <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`${s.hoverRow} transition-colors`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${u.role === "super_admin" ? "bg-gradient-to-br from-orange-500 to-pink-500 text-white" : s.isDark ? "bg-white/[0.06] text-white/50" : "bg-gray-100 text-gray-500"}`}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className={`text-xs font-semibold ${s.textPrimary}`}>{u.name}</p>
                          <p className={`text-[10px] ${s.textMuted} md:hidden`}>{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`px-5 py-3 hidden md:table-cell text-xs ${s.textSecondary}`}>{u.email}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        u.role === "super_admin" ? s.badge("orange") : u.role === "store_owner" ? s.badge("blue") : s.badge("gray")
                      }`}>
                        {u.role === "super_admin" ? "Admin" : u.role === "store_owner" ? "Lojista" : "Cliente"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${u.is_active ? s.badge("green") : s.badge("red")}`}>
                        {u.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className={`px-5 py-3 hidden lg:table-cell text-[11px] ${s.textMuted}`}>{timeAgo(u.created_at)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(u)} className={`p-1.5 rounded-lg ${s.textMuted} hover:text-orange-500 ${s.isDark ? "hover:bg-orange-500/10" : "hover:bg-orange-50"} transition-colors`} title="Editar">
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button onClick={() => toggleActive(u.id)} disabled={actionLoading === u.id || u.id === currentUser?.id}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 ${u.is_active ? "text-green-500 hover:bg-green-50" : "text-red-500 hover:bg-red-50"}`}
                          title={u.is_active ? "Desactivar" : "Activar"}>
                          {actionLoading === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : u.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                        </button>
                        <button onClick={() => deleteUser(u.id, u.name)} disabled={actionLoading === u.id || u.id === currentUser?.id}
                          className={`p-1.5 rounded-lg ${s.textMuted} hover:text-red-500 ${s.isDark ? "hover:bg-red-500/10" : "hover:bg-red-50"} transition-colors disabled:opacity-30`} title="Eliminar">
                          {actionLoading === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
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

      {/* Modal Create / Edit */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editUser ? "Editar Utilizador" : "Novo Utilizador"} size="md">
        <div className="space-y-4">
          {formError && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">{formError}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Nome" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Nome completo" required />
            <InputField label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="email@exemplo.com" type="email" required />
            <div>
              <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Password {!editUser && <span className="text-red-500">*</span>}</label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editUser ? "Deixar vazio para manter" : "Minimo 6 caracteres"}
                  className={`w-full ${s.input} border rounded-xl px-3 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all`} />
                <button type="button" onClick={() => setShowPass(!showPass)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${s.textMuted}`}>
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <InputField label="Telefone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+244 9XX XXX XXX" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Role <span className="text-red-500">*</span></label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                className={`w-full ${s.input} border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20`}>
                <option value="customer">Cliente</option>
                <option value="store_owner">Dono de Loja</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <div>
              <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Estado</label>
              <div className="flex items-center gap-3 mt-1">
                <button onClick={() => setForm({ ...form, is_active: !form.is_active })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${form.is_active ? "bg-green-500" : s.isDark ? "bg-white/20" : "bg-gray-300"}`}>
                  <span className={`absolute top-0.5 ${form.is_active ? "left-[22px]" : "left-0.5"} h-5 w-5 rounded-full bg-white shadow transition-all`} />
                </button>
                <span className={`text-sm ${s.textSecondary}`}>{form.is_active ? "Activo" : "Inactivo"}</span>
              </div>
            </div>
          </div>
          <div className={`flex justify-end gap-2 pt-2 border-t ${s.borderLight}`}>
            <button onClick={() => setModalOpen(false)} className={`px-4 py-2.5 rounded-xl text-xs font-medium ${s.btnSecondary}`}>Cancelar</button>
            <button onClick={saveUser} disabled={saving} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold ${s.btnPrimary} disabled:opacity-50 shadow-sm`}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editUser ? "Guardar Alteracoes" : "Criar Utilizador"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
