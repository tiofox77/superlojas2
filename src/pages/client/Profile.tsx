import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import { useState } from "react";
import { User, Mail, Loader2, Upload, Camera, Store, LayoutDashboard, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import PhoneInput from "@/components/PhoneInput";
import { useToastNotification } from "@/contexts/ToastContext";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

export default function ClientProfile() {
  const { user, token, updateProfile } = useAuth();
  const s = useAdminStyles();
  const toast = useToastNotification();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || "");

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("phone", phone);
      if (avatarFile) fd.append("avatar", avatarFile);

      const res = await fetch(`${API}/client/profile`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        body: fd,
      });
      const d = await res.json();
      if (res.ok) {
        toast.success("Perfil actualizado", d.message);
        if (d.user) updateProfile(d.user);
      } else {
        toast.error("Erro", d.message || "Nao foi possivel actualizar.");
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
        <h2 className={`text-lg font-bold ${s.textPrimary}`}>Meu Perfil</h2>
        <p className={`text-xs ${s.textMuted}`}>Actualizar informacoes pessoais</p>
      </div>

      {/* Panel Quick Access - store owners & admins */}
      {(user?.role === "store_owner" || user?.role === "super_admin") && (
        <div className="flex flex-col sm:flex-row gap-3">
          {user.role === "store_owner" && (user.stores?.length || user.store) && (
            <Link to="/minha-loja" className={`flex items-center justify-between gap-3 flex-1 rounded-2xl border p-4 transition-all ${s.isDark ? "bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40" : "bg-emerald-50 border-emerald-200 hover:border-emerald-400 shadow-sm"}`}>
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${s.isDark ? "bg-emerald-500/20" : "bg-emerald-100"}`}>
                  <Store className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className={`text-sm font-bold ${s.isDark ? "text-emerald-400" : "text-emerald-700"}`}>
                    {(user.stores?.length || 0) > 1 ? "Minhas Lojas" : "Painel da Loja"}
                  </p>
                  <p className={`text-[11px] ${s.isDark ? "text-emerald-400/60" : "text-emerald-600/70"}`}>Gerir produtos, pedidos e mais</p>
                </div>
              </div>
              <ChevronRight className={`h-5 w-5 ${s.isDark ? "text-emerald-400/40" : "text-emerald-400"}`} />
            </Link>
          )}
          {user.role === "super_admin" && (
            <Link to="/admin" className={`flex items-center justify-between gap-3 flex-1 rounded-2xl border p-4 transition-all ${s.isDark ? "bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40" : "bg-blue-50 border-blue-200 hover:border-blue-400 shadow-sm"}`}>
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${s.isDark ? "bg-blue-500/20" : "bg-blue-100"}`}>
                  <LayoutDashboard className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className={`text-sm font-bold ${s.isDark ? "text-blue-400" : "text-blue-700"}`}>Painel Admin</p>
                  <p className={`text-[11px] ${s.isDark ? "text-blue-400/60" : "text-blue-600/70"}`}>Gerir plataforma e utilizadores</p>
                </div>
              </div>
              <ChevronRight className={`h-5 w-5 ${s.isDark ? "text-blue-400/40" : "text-blue-400"}`} />
            </Link>
          )}
        </div>
      )}

      <div className={cardCls}>
        {/* Avatar */}
        <div className="flex items-center gap-5 mb-6">
          <div className="relative group">
            <div className="h-20 w-20 rounded-full overflow-hidden bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                user?.name?.charAt(0).toUpperCase()
              )}
            </div>
            <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera className="h-5 w-5 text-white" />
              <input type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
            </label>
          </div>
          <div>
            <p className={`text-sm font-bold ${s.textPrimary}`}>{user?.name}</p>
            <p className={`text-xs ${s.textMuted}`}>{user?.email}</p>
            <p className={`text-[10px] ${s.textMuted} mt-1`}>Clique na foto para alterar</p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Nome Completo</label>
            <div className="relative">
              <User className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${s.textMuted}`} />
              <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputCls} pl-10`} placeholder="Seu nome" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Email</label>
            <div className="relative">
              <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${s.textMuted}`} />
              <input value={user?.email || ""} disabled className={`${inputCls} pl-10 opacity-60 cursor-not-allowed`} />
            </div>
            <p className={`text-[10px] ${s.textMuted} mt-1`}>O email nao pode ser alterado</p>
          </div>

          <div>
            <label className={labelCls}>Telefone</label>
            <PhoneInput value={phone} onChange={setPhone} className={inputCls} />
          </div>

          <div className="flex justify-end pt-2">
            <button onClick={handleSave} disabled={saving} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 shadow-sm transition-colors`}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Guardar Perfil
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
