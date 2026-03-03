import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useToastNotification } from "@/contexts/ToastContext";
import {
  CreditCard, Plus, Trash2, Loader2, Save, ToggleLeft, ToggleRight,
  Banknote, Smartphone, Building2, Wallet, HandCoins, QrCode, GripVertical
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

interface PaymentMethod {
  type: string;
  label: string;
  details: string;
  account: string;
  is_active: boolean;
}

const PAYMENT_TYPES = [
  { type: "multicaixa_express", label: "Multicaixa Express", icon: Smartphone, color: "text-orange-500", bg: "bg-orange-50" },
  { type: "transfer", label: "Transferencia Bancaria", icon: Building2, color: "text-blue-500", bg: "bg-blue-50" },
  { type: "cash_delivery", label: "Pagamento na Entrega", icon: HandCoins, color: "text-emerald-500", bg: "bg-emerald-50" },
  { type: "cash_pickup", label: "Pagamento na Recolha", icon: Wallet, color: "text-purple-500", bg: "bg-purple-50" },
  { type: "deposit", label: "Deposito Bancario", icon: Banknote, color: "text-cyan-500", bg: "bg-cyan-50" },
  { type: "qr_code", label: "QR Code / Pagamento Digital", icon: QrCode, color: "text-pink-500", bg: "bg-pink-50" },
  { type: "other", label: "Outro", icon: CreditCard, color: "text-gray-500", bg: "bg-gray-50" },
];

const emptyMethod: PaymentMethod = { type: "multicaixa_express", label: "", details: "", account: "", is_active: true };

export default function StorePanelPayments() {
  const { token } = useAuth();
  const s = useAdminStyles();
  const { slug } = useOutletContext<{ slug: string }>();
  const toast = useToastNotification();

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token || !slug) return;
    setLoading(true);
    fetch(`${API}/store-panel/${slug}/payments`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } })
      .then((r) => r.json())
      .then((data) => setMethods(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, slug]);

  const addMethod = () => {
    const typeInfo = PAYMENT_TYPES[0];
    setMethods([...methods, { ...emptyMethod, label: typeInfo.label }]);
  };

  const removeMethod = (index: number) => {
    setMethods(methods.filter((_, i) => i !== index));
  };

  const updateMethod = (index: number, field: keyof PaymentMethod, value: string | boolean) => {
    const updated = [...methods];
    (updated[index] as any)[field] = value;
    // Auto-set label when type changes
    if (field === "type") {
      const typeInfo = PAYMENT_TYPES.find((t) => t.type === value);
      if (typeInfo && (!updated[index].label || PAYMENT_TYPES.some((t) => t.label === updated[index].label))) {
        updated[index].label = typeInfo.label;
      }
    }
    setMethods(updated);
  };

  const savePayments = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/store-panel/${slug}/payments`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ payment_methods: methods }),
      });
      if (res.ok) toast.success("Pagamentos guardados", "Metodos de pagamento actualizados.");
      else { const data = await res.json(); toast.error("Erro", data.message || "Nao foi possivel guardar."); }
    } catch { toast.error("Erro", "Erro de conexao."); }
    finally { setSaving(false); }
  };

  const getTypeInfo = (type: string) => PAYMENT_TYPES.find((t) => t.type === type) || PAYMENT_TYPES[PAYMENT_TYPES.length - 1];

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl">
        {[...Array(3)].map((_, i) => (
          <div key={i} className={`rounded-2xl border ${s.card} p-6 animate-pulse`}>
            <div className={`h-5 w-48 ${s.skeleton} rounded mb-4`} />
            <div className="grid grid-cols-2 gap-4">
              <div className={`h-10 ${s.skeleton} rounded-xl`} />
              <div className={`h-10 ${s.skeleton} rounded-xl`} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-bold ${s.textPrimary}`}>Metodos de Pagamento</h2>
          <p className={`text-xs ${s.textMuted}`}>Configure como os clientes podem pagar na sua loja</p>
        </div>
        <button onClick={addMethod} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${s.btnPrimary} text-xs font-semibold shadow-sm`}>
          <Plus className="h-4 w-4" /> Adicionar
        </button>
      </div>

      {methods.length === 0 ? (
        <div className={`rounded-2xl border ${s.card} p-10 text-center`}>
          <div className={`h-16 w-16 rounded-2xl ${s.isDark ? "bg-white/5" : "bg-gray-100"} flex items-center justify-center mx-auto mb-4`}>
            <CreditCard className={`h-8 w-8 ${s.textMuted}`} />
          </div>
          <h3 className={`text-sm font-bold ${s.textPrimary} mb-1`}>Nenhum metodo de pagamento</h3>
          <p className={`text-xs ${s.textMuted} mb-4`}>Adicione os metodos de pagamento que a sua loja aceita para que os clientes saibam como pagar.</p>
          <button onClick={addMethod} className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl ${s.btnPrimary} text-xs font-semibold shadow-sm`}>
            <Plus className="h-4 w-4" /> Adicionar Primeiro Metodo
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {methods.map((method, index) => {
            const typeInfo = getTypeInfo(method.type);
            const Icon = typeInfo.icon;
            return (
              <div key={index} className={`rounded-2xl border ${s.card} ${s.cardHover} overflow-hidden transition-all`}>
                {/* Header */}
                <div className={`flex items-center justify-between px-5 py-3 border-b ${s.borderLight}`}>
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-xl ${s.isDark ? "bg-white/5" : typeInfo.bg} flex items-center justify-center`}>
                      <Icon className={`h-4.5 w-4.5 ${typeInfo.color}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${s.textPrimary}`}>{method.label || typeInfo.label}</p>
                      <p className={`text-[10px] ${s.textMuted}`}>{typeInfo.label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateMethod(index, "is_active", !method.is_active)}
                      className={`p-1 rounded-lg transition-colors ${method.is_active ? "text-emerald-500" : s.textMuted}`}
                      title={method.is_active ? "Activo" : "Inactivo"}>
                      {method.is_active ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                    </button>
                    <button onClick={() => removeMethod(index)}
                      className={`p-1.5 rounded-lg ${s.textMuted} hover:text-red-500 transition-colors`} title="Remover">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Fields */}
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Tipo de Pagamento</label>
                      <select value={method.type} onChange={(e) => updateMethod(index, "type", e.target.value)}
                        className={`w-full ${s.input} border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20`}>
                        {PAYMENT_TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Nome / Label</label>
                      <input type="text" value={method.label} onChange={(e) => updateMethod(index, "label", e.target.value)}
                        placeholder="Ex: Multicaixa Express"
                        className={`w-full ${s.input} border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20`} />
                    </div>
                    <div>
                      <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>
                        {method.type === "multicaixa_express" ? "Numero de Telefone" :
                         method.type === "transfer" || method.type === "deposit" ? "IBAN / Numero da Conta" :
                         method.type === "qr_code" ? "Link ou Codigo" : "Conta / Referencia"}
                      </label>
                      <input type="text" value={method.account} onChange={(e) => updateMethod(index, "account", e.target.value)}
                        placeholder={
                          method.type === "multicaixa_express" ? "+244 9XX XXX XXX" :
                          method.type === "transfer" || method.type === "deposit" ? "AO06 0000 0000 0000 0000 0000 0" :
                          method.type === "cash_delivery" ? "Opcional" :
                          method.type === "cash_pickup" ? "Endereco da loja" : "Referencia"
                        }
                        className={`w-full ${s.input} border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20`} />
                    </div>
                    <div>
                      <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Instrucoes / Detalhes</label>
                      <input type="text" value={method.details} onChange={(e) => updateMethod(index, "details", e.target.value)}
                        placeholder="Ex: Banco BAI, titular: João Silva"
                        className={`w-full ${s.input} border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20`} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info card */}
      <div className={`rounded-xl p-4 ${s.isDark ? "bg-blue-500/10 border border-blue-500/20" : "bg-blue-50 border border-blue-100"}`}>
        <p className={`text-xs ${s.isDark ? "text-blue-300" : "text-blue-700"} leading-relaxed`}>
          <strong>Dica:</strong> Os metodos de pagamento activos serao exibidos na pagina publica da sua loja para que os clientes saibam como pagar. 
          Inclua o maximo de detalhes possivel (numero de conta, titular, banco) para facilitar o pagamento.
        </p>
      </div>

      {/* Save button */}
      {methods.length > 0 && (
        <div className={`flex justify-end pt-3 border-t ${s.borderLight}`}>
          <button onClick={savePayments} disabled={saving}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold ${s.btnPrimary} disabled:opacity-50 shadow-sm`}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar Pagamentos
          </button>
        </div>
      )}
    </div>
  );
}
