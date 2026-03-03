import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import Modal from "@/components/admin/Modal";
import { useEffect, useState } from "react";
import {
  CreditCard, Loader2, Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  Building2, Phone, FileText, GripVertical, Banknote
} from "lucide-react";
import { useToastNotification } from "@/contexts/ToastContext";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

interface PayMethod {
  id: number;
  name: string;
  type: string;
  bank_name: string | null;
  iban: string | null;
  account_number: string | null;
  account_holder: string | null;
  phone_number: string | null;
  instructions: string | null;
  is_active: boolean;
  sort_order: number;
}

const TYPE_OPTIONS = [
  { value: "transferencia", label: "Transferencia Bancaria" },
  { value: "multicaixa", label: "Multicaixa Express" },
  { value: "unitel_money", label: "Unitel Money" },
  { value: "cash", label: "Pagamento em Cash" },
  { value: "outro", label: "Outro" },
];

const emptyForm = {
  name: "", type: "transferencia", bank_name: "", iban: "", account_number: "",
  account_holder: "", phone_number: "", instructions: "", is_active: true, sort_order: 0,
};

export default function AdminPaymentMethods() {
  const { token } = useAuth();
  const s = useAdminStyles();
  const toast = useToastNotification();

  const [methods, setMethods] = useState<PayMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PayMethod | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };

  const fetchMethods = () => {
    setLoading(true);
    fetch(`${API}/admin/subscription-payment-methods`, { headers })
      .then((r) => r.json())
      .then((d) => setMethods(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchMethods(); }, [token]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, sort_order: methods.length });
    setModalOpen(true);
  };

  const openEdit = (m: PayMethod) => {
    setEditing(m);
    setForm({
      name: m.name, type: m.type, bank_name: m.bank_name || "", iban: m.iban || "",
      account_number: m.account_number || "", account_holder: m.account_holder || "",
      phone_number: m.phone_number || "", instructions: m.instructions || "",
      is_active: m.is_active, sort_order: m.sort_order,
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.type) { toast.error("Erro", "Nome e tipo sao obrigatorios."); return; }
    setSaving(true);
    try {
      const url = editing
        ? `${API}/admin/subscription-payment-methods/${editing.id}`
        : `${API}/admin/subscription-payment-methods`;
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success(editing ? "Metodo actualizado" : "Metodo criado");
        setModalOpen(false); fetchMethods();
      } else {
        const d = await res.json();
        toast.error("Erro", d.message || JSON.stringify(d.errors));
      }
    } finally { setSaving(false); }
  };

  const toggleActive = async (m: PayMethod) => {
    await fetch(`${API}/admin/subscription-payment-methods/${m.id}`, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !m.is_active }),
    });
    fetchMethods();
  };

  const remove = async (m: PayMethod) => {
    if (!confirm(`Eliminar "${m.name}"?`)) return;
    await fetch(`${API}/admin/subscription-payment-methods/${m.id}`, { method: "DELETE", headers });
    toast.success("Eliminado"); fetchMethods();
  };

  const inputCls = `w-full ${s.input} border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20`;
  const isBankType = form.type === "transferencia";
  const isMobileType = form.type === "multicaixa" || form.type === "unitel_money";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-bold ${s.textPrimary}`}>Metodos de Pagamento</h2>
          <p className={`text-xs ${s.textMuted}`}>Configure os metodos de pagamento para subscricoes</p>
        </div>
        <button onClick={openCreate}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${s.btnPrimary} text-xs font-semibold shadow-sm`}>
          <Plus className="h-4 w-4" /> Novo Metodo
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-orange-500" /></div>
      ) : methods.length === 0 ? (
        <div className={`rounded-2xl border ${s.card} py-16 text-center`}>
          <CreditCard className={`h-10 w-10 ${s.empty} mx-auto mb-3`} />
          <p className={`text-sm ${s.textMuted}`}>Nenhum metodo de pagamento configurado.</p>
          <p className={`text-xs ${s.textMuted} mt-1`}>Adicione metodos para que os lojistas possam enviar comprovativos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {methods.map((m) => (
            <div key={m.id} className={`rounded-2xl border ${s.card} overflow-hidden transition-all ${!m.is_active ? "opacity-50" : ""}`}>
              <div className={`p-4 space-y-3`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                      m.type === "transferencia" ? "bg-blue-100 text-blue-600" :
                      m.type === "multicaixa" ? "bg-orange-100 text-orange-600" :
                      m.type === "unitel_money" ? "bg-red-100 text-red-600" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {m.type === "transferencia" ? <Building2 className="h-5 w-5" /> :
                       m.type === "multicaixa" || m.type === "unitel_money" ? <Phone className="h-5 w-5" /> :
                       <Banknote className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${s.textPrimary}`}>{m.name}</p>
                      <p className={`text-[10px] ${s.textMuted} uppercase`}>{TYPE_OPTIONS.find(t => t.value === m.type)?.label || m.type}</p>
                    </div>
                  </div>
                  <button onClick={() => toggleActive(m)}
                    className={`p-1 ${m.is_active ? "text-emerald-500" : s.textMuted}`}>
                    {m.is_active ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                  </button>
                </div>

                {/* Details */}
                <div className={`text-[11px] ${s.textSecondary} space-y-1`}>
                  {m.bank_name && <p><strong>Banco:</strong> {m.bank_name}</p>}
                  {m.iban && <p><strong>IBAN:</strong> <span className="font-mono text-[10px]">{m.iban}</span></p>}
                  {m.account_number && <p><strong>N. Conta:</strong> {m.account_number}</p>}
                  {m.account_holder && <p><strong>Titular:</strong> {m.account_holder}</p>}
                  {m.phone_number && <p><strong>Telefone:</strong> {m.phone_number}</p>}
                  {m.instructions && <p className={`text-[10px] ${s.textMuted} italic mt-1`}>{m.instructions}</p>}
                </div>

                {/* Actions */}
                <div className={`flex gap-1.5 pt-2 border-t ${s.borderLight}`}>
                  <button onClick={() => openEdit(m)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium ${s.isDark ? "bg-white/[0.04] text-white/60 hover:text-white" : "bg-gray-50 text-gray-500 hover:text-gray-700"} transition-colors`}>
                    <Pencil className="h-3 w-3" /> Editar
                  </button>
                  <button onClick={() => remove(m)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 className="h-3 w-3" /> Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar Metodo" : "Novo Metodo de Pagamento"} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={`text-[10px] font-medium ${s.textMuted} mb-1 block`}>Nome *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: BAI - Conta Principal" className={inputCls} />
            </div>
            <div>
              <label className={`text-[10px] font-medium ${s.textMuted} mb-1 block`}>Tipo *</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>
                {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className={`text-[10px] font-medium ${s.textMuted} mb-1 block`}>Ordem</label>
              <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                className={inputCls} min={0} />
            </div>
          </div>

          {/* Bank fields */}
          {isBankType && (
            <div className={`rounded-xl p-3 border ${s.borderLight} space-y-3`}>
              <p className={`text-[10px] font-bold ${s.textMuted} uppercase tracking-wider`}>Dados Bancarios</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-[10px] font-medium ${s.textMuted} mb-1 block`}>Banco</label>
                  <input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                    placeholder="Ex: BAI, BFA, BIC..." className={inputCls} />
                </div>
                <div>
                  <label className={`text-[10px] font-medium ${s.textMuted} mb-1 block`}>Titular</label>
                  <input value={form.account_holder} onChange={(e) => setForm({ ...form, account_holder: e.target.value })}
                    placeholder="Nome do titular" className={inputCls} />
                </div>
                <div>
                  <label className={`text-[10px] font-medium ${s.textMuted} mb-1 block`}>IBAN</label>
                  <input value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })}
                    placeholder="AO06 0000 0000 0000 0000 0000 0" className={inputCls} />
                </div>
                <div>
                  <label className={`text-[10px] font-medium ${s.textMuted} mb-1 block`}>N. Conta</label>
                  <input value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                    placeholder="Numero da conta" className={inputCls} />
                </div>
              </div>
            </div>
          )}

          {/* Mobile payment fields */}
          {isMobileType && (
            <div className={`rounded-xl p-3 border ${s.borderLight} space-y-3`}>
              <p className={`text-[10px] font-bold ${s.textMuted} uppercase tracking-wider`}>Dados Pagamento Movel</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-[10px] font-medium ${s.textMuted} mb-1 block`}>Telefone</label>
                  <input value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                    placeholder="Ex: 923 456 789" className={inputCls} />
                </div>
                <div>
                  <label className={`text-[10px] font-medium ${s.textMuted} mb-1 block`}>Titular</label>
                  <input value={form.account_holder} onChange={(e) => setForm({ ...form, account_holder: e.target.value })}
                    placeholder="Nome do titular" className={inputCls} />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className={`text-[10px] font-medium ${s.textMuted} mb-1 block`}>Instrucoes (opcional)</label>
            <textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              rows={2} placeholder="Instrucoes adicionais para o pagamento..."
              className={`${inputCls} resize-none`} />
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setForm({ ...form, is_active: !form.is_active })}
              className={`p-1 ${form.is_active ? "text-emerald-500" : s.textMuted}`}>
              {form.is_active ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
            </button>
            <span className={`text-xs ${s.textSecondary}`}>{form.is_active ? "Activo" : "Inactivo"}</span>
          </div>

          <div className={`flex justify-end gap-2 pt-2 border-t ${s.borderLight}`}>
            <button onClick={() => setModalOpen(false)} className={`px-4 py-2.5 rounded-xl text-xs font-medium ${s.btnSecondary}`}>Cancelar</button>
            <button onClick={save} disabled={saving}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold ${s.btnPrimary} disabled:opacity-50 shadow-sm`}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} {editing ? "Guardar" : "Criar"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
