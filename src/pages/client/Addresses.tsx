import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import { useEffect, useState } from "react";
import { MapPin, Plus, Trash2, Loader2, CheckCircle2, Phone, User, Edit3 } from "lucide-react";
import { useToastNotification } from "@/contexts/ToastContext";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

interface Address {
  label: string; name: string; phone: string;
  address: string; province: string; city: string;
  is_default: boolean;
}

interface ProvinceData { name: string; municipalities: string[]; }

const emptyAddr: Address = { label: "", name: "", phone: "", address: "", province: "", city: "", is_default: false };

export default function ClientAddresses() {
  const { token } = useAuth();
  const s = useAdminStyles();
  const toast = useToastNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<Address>(emptyAddr);
  const [provinces, setProvinces] = useState<ProvinceData[]>([]);

  const currentMunicipalities = provinces.find(p => p.name === form.province)?.municipalities || [];

  const hdrs = { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" };

  useEffect(() => {
    fetch(`${API}/provinces`).then(r => r.json()).then(d => setProvinces(d)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/client/addresses`, { headers: hdrs })
      .then((r) => r.json())
      .then((d) => setAddresses(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, [token]);

  const openAdd = () => {
    setEditing(-1);
    setForm(emptyAddr);
  };

  const openEdit = (i: number) => {
    setEditing(i);
    setForm({ ...addresses[i] });
  };

  const removeAddr = (i: number) => {
    const updated = addresses.filter((_, idx) => idx !== i);
    setAddresses(updated);
    saveToServer(updated);
  };

  const setDefault = (i: number) => {
    const updated = addresses.map((a, idx) => ({ ...a, is_default: idx === i }));
    setAddresses(updated);
    saveToServer(updated);
  };

  const saveForm = () => {
    if (!form.label || !form.name || !form.phone || !form.address || !form.province) {
      toast.error("Erro", "Preencha todos os campos obrigatorios.");
      return;
    }
    let updated: Address[];
    if (editing === -1) {
      if (addresses.length === 0) form.is_default = true;
      updated = [...addresses, form];
    } else {
      updated = addresses.map((a, i) => (i === editing ? form : a));
    }
    setAddresses(updated);
    setEditing(null);
    saveToServer(updated);
  };

  const saveToServer = async (addrs: Address[]) => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/client/addresses`, {
        method: "PUT", headers: hdrs, body: JSON.stringify({ addresses: addrs }),
      });
      const d = await res.json();
      if (res.ok) {
        toast.success("Guardado", d.message);
        if (d.addresses) setAddresses(d.addresses);
      } else toast.error("Erro", d.message || "Nao foi possivel guardar.");
    } catch { toast.error("Erro de conexao"); }
    finally { setSaving(false); }
  };

  const cardCls = `rounded-2xl border ${s.card} p-5`;
  const labelCls = `block text-[11px] font-semibold ${s.textMuted} uppercase tracking-wider mb-1.5`;
  const inputCls = `w-full rounded-xl border ${s.isDark ? "bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30" : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"} px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30`;

  if (loading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className={`h-8 w-8 animate-spin ${s.textMuted}`} /></div>;
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-bold ${s.textPrimary}`}>Meus Enderecos</h2>
          <p className={`text-xs ${s.textMuted}`}>Gerir enderecos de entrega (max. 5)</p>
        </div>
        {addresses.length < 5 && editing === null && (
          <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-sm">
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </button>
        )}
      </div>

      {/* Editing form */}
      {editing !== null && (
        <div className={cardCls}>
          <h3 className={`text-sm font-bold ${s.textPrimary} mb-4`}>{editing === -1 ? "Novo Endereco" : "Editar Endereco"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Etiqueta *</label>
              <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className={inputCls} placeholder="Ex: Casa, Trabalho" />
            </div>
            <div>
              <label className={labelCls}>Nome Completo *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Nome do destinatario" />
            </div>
            <div>
              <label className={labelCls}>Telefone *</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} placeholder="+244 9XX XXX XXX" />
            </div>
            <div>
              <label className={labelCls}>Provincia *</label>
              <select value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value, city: "" })} className={inputCls}>
                <option value="">Seleccionar provincia...</option>
                {provinces.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Municipio *</label>
              <select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputCls} disabled={!form.province}>
                <option value="">{form.province ? "Seleccionar municipio..." : "Seleccione provincia primeiro"}</option>
                {currentMunicipalities.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Endereco Completo *</label>
              <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} className={inputCls} placeholder="Rua, numero, bairro, referencia..." />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setEditing(null)} className={`px-4 py-2 rounded-xl text-xs font-medium ${s.btnSecondary}`}>Cancelar</button>
            <button onClick={saveForm} disabled={saving} className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition-colors">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* Address list */}
      {addresses.length === 0 && editing === null ? (
        <div className={`${cardCls} text-center py-12`}>
          <MapPin className={`h-10 w-10 ${s.textMuted} mx-auto mb-2 opacity-40`} />
          <p className={`text-xs ${s.textMuted} mb-3`}>Nenhum endereco guardado</p>
          <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-orange-500 text-white hover:bg-orange-600 transition-colors">
            <Plus className="h-3.5 w-3.5" /> Adicionar Primeiro Endereco
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((addr, i) => (
            <div key={i} className={`${cardCls} relative ${addr.is_default ? s.isDark ? "ring-1 ring-orange-500/30" : "ring-1 ring-orange-500/20" : ""}`}>
              <div className="flex items-start gap-4">
                <div className={`h-10 w-10 rounded-xl ${s.isDark ? "bg-emerald-500/10" : "bg-emerald-50"} flex items-center justify-center shrink-0`}>
                  <MapPin className="h-5 w-5 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className={`text-xs font-bold ${s.textPrimary}`}>{addr.label}</p>
                    {addr.is_default && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-orange-500/10 text-orange-500">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Padrao
                      </span>
                    )}
                  </div>
                  <p className={`text-xs ${s.textSecondary} flex items-center gap-1`}><User className="h-3 w-3 shrink-0" /> {addr.name}</p>
                  <p className={`text-xs ${s.textSecondary} flex items-center gap-1`}><Phone className="h-3 w-3 shrink-0" /> {addr.phone}</p>
                  <p className={`text-xs ${s.textSecondary} flex items-center gap-1 mt-0.5`}><MapPin className="h-3 w-3 shrink-0" /> {addr.address}, {addr.city && `${addr.city}, `}{addr.province}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!addr.is_default && (
                    <button onClick={() => setDefault(i)} className={`p-2 rounded-lg text-xs ${s.textMuted} hover:text-orange-500 ${s.isDark ? "hover:bg-white/5" : "hover:bg-gray-100"} transition-colors`} title="Definir como padrao">
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => openEdit(i)} className={`p-2 rounded-lg text-xs ${s.textMuted} hover:text-blue-500 ${s.isDark ? "hover:bg-white/5" : "hover:bg-gray-100"} transition-colors`}>
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button onClick={() => removeAddr(i)} className={`p-2 rounded-lg text-xs ${s.textMuted} hover:text-red-500 ${s.isDark ? "hover:bg-white/5" : "hover:bg-gray-100"} transition-colors`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
