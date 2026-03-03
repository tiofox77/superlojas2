import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import { useState } from "react";
import { Lock, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { useToastNotification } from "@/contexts/ToastContext";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

export default function ClientSecurity() {
  const { token } = useAuth();
  const s = useAdminStyles();
  const toast = useToastNotification();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const handleSave = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Erro", "Preencha todos os campos.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Erro", "A nova palavra-passe deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Erro", "As palavras-passe nao coincidem.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API}/client/password`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: currentPassword,
          password: newPassword,
          password_confirmation: confirmPassword,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        toast.success("Palavra-passe alterada", d.message);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error("Erro", d.message || "Nao foi possivel alterar.");
      }
    } catch { toast.error("Erro de conexao"); }
    finally { setSaving(false); }
  };

  const cardCls = `rounded-2xl border ${s.card} p-6`;
  const labelCls = `block text-[11px] font-semibold ${s.textMuted} uppercase tracking-wider mb-1.5`;
  const inputCls = `w-full rounded-xl border ${s.isDark ? "bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30" : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"} px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30`;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className={`text-lg font-bold ${s.textPrimary}`}>Seguranca</h2>
        <p className={`text-xs ${s.textMuted}`}>Alterar a sua palavra-passe</p>
      </div>

      <div className={cardCls}>
        <div className="flex items-center gap-3 mb-5">
          <div className={`h-10 w-10 rounded-xl ${s.isDark ? "bg-red-500/10" : "bg-red-50"} flex items-center justify-center`}>
            <ShieldCheck className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h3 className={`text-sm font-bold ${s.textPrimary}`}>Alterar Palavra-Passe</h3>
            <p className={`text-[11px] ${s.textMuted}`}>Recomendamos alterar periodicamente por seguranca</p>
          </div>
        </div>

        <div className="space-y-4 max-w-md">
          <div>
            <label className={labelCls}>Palavra-Passe Actual</label>
            <div className="relative">
              <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${s.textMuted}`} />
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={`${inputCls} pl-10 pr-10`}
                placeholder="Palavra-passe actual"
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${s.textMuted}`}>
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className={labelCls}>Nova Palavra-Passe</label>
            <div className="relative">
              <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${s.textMuted}`} />
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`${inputCls} pl-10 pr-10`}
                placeholder="Minimo 6 caracteres"
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${s.textMuted}`}>
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className={labelCls}>Confirmar Nova Palavra-Passe</label>
            <div className="relative">
              <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${s.textMuted}`} />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`${inputCls} pl-10`}
                placeholder="Repetir nova palavra-passe"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 shadow-sm transition-colors">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Alterar Palavra-Passe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
