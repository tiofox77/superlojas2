import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import { useState } from "react";
import { motion } from "framer-motion";
import { Megaphone, Send, Users, Store, Loader2, CheckCircle2, Mail, MessageSquare } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

type Channel = "email" | "sms" | "both";
type Audience = "all" | "customers" | "store_owners" | "specific";

export default function AdminNotifications() {
  const { token } = useAuth();
  const s = useAdminStyles();
  const [audience, setAudience] = useState<Audience>("all");
  const [channel, setChannel] = useState<Channel>("email");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [specificEmails, setSpecificEmails] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const sendNotification = async () => {
    if (!subject || !message) { setError("Assunto e mensagem sao obrigatorios."); return; }
    if (audience === "specific" && !specificEmails.trim()) { setError("Insira pelo menos um email."); return; }
    setSending(true); setError(""); setSuccess(false);
    try {
      const body = {
        audience,
        channel,
        subject,
        message,
        specific_emails: audience === "specific" ? specificEmails.split(",").map((e) => e.trim()).filter(Boolean) : [],
      };
      const res = await fetch(`${API}/admin/notifications/send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSuccess(true);
        setSubject(""); setMessage(""); setSpecificEmails("");
        setTimeout(() => setSuccess(false), 5000);
      } else {
        const data = await res.json();
        setError(data.message || "Erro ao enviar notificacao.");
      }
    } catch { setError("Erro de conexao."); }
    finally { setSending(false); }
  };

  const audiences: { value: Audience; label: string; desc: string; icon: typeof Users; color: string }[] = [
    { value: "all", label: "Todos", desc: "Clientes + Lojistas", icon: Users, color: "text-blue-500" },
    { value: "customers", label: "Clientes", desc: "Apenas clientes", icon: Users, color: "text-emerald-500" },
    { value: "store_owners", label: "Lojistas", desc: "Donos de lojas", icon: Store, color: "text-orange-500" },
    { value: "specific", label: "Especifico", desc: "Emails especificos", icon: Mail, color: "text-violet-500" },
  ];

  const channels: { value: Channel; label: string; icon: typeof Mail }[] = [
    { value: "email", label: "Email", icon: Mail },
    { value: "sms", label: "SMS", icon: MessageSquare },
    { value: "both", label: "Email + SMS", icon: Megaphone },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className={`text-lg font-bold ${s.textPrimary}`}>Enviar Notificacoes</h2>
        <p className={`text-xs ${s.textMuted}`}>Notificar clientes, lojistas ou utilizadores especificos</p>
      </div>

      {success && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm">
          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
          <span>Notificacao enviada com sucesso!</span>
        </motion.div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">{error}</div>
      )}

      {/* Audience */}
      <div className={`rounded-2xl border ${s.card} p-5 space-y-4`}>
        <h3 className={`text-sm font-semibold ${s.textPrimary}`}>Destinatarios</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {audiences.map((a) => (
            <button key={a.value} onClick={() => setAudience(a.value)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all ${
                audience === a.value
                  ? "bg-orange-50 border-orange-300 shadow-sm"
                  : `${s.isDark ? "border-white/[0.06] hover:border-white/[0.12]" : "border-gray-200 hover:border-gray-300"}`
              }`}>
              <a.icon className={`h-5 w-5 ${audience === a.value ? "text-orange-500" : a.color}`} />
              <span className={`text-xs font-semibold ${audience === a.value ? "text-orange-600" : s.textPrimary}`}>{a.label}</span>
              <span className={`text-[10px] ${s.textMuted}`}>{a.desc}</span>
            </button>
          ))}
        </div>

        {audience === "specific" && (
          <div>
            <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Emails (separados por virgula)</label>
            <textarea value={specificEmails} onChange={(e) => setSpecificEmails(e.target.value)} rows={2}
              placeholder="user1@email.com, user2@email.com"
              className={`w-full ${s.input} border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 resize-none`} />
          </div>
        )}
      </div>

      {/* Channel */}
      <div className={`rounded-2xl border ${s.card} p-5 space-y-4`}>
        <h3 className={`text-sm font-semibold ${s.textPrimary}`}>Canal de Envio</h3>
        <div className="flex gap-3">
          {channels.map((c) => (
            <button key={c.value} onClick={() => setChannel(c.value)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                channel === c.value
                  ? "bg-orange-50 border-orange-300 text-orange-600 shadow-sm"
                  : s.btnSecondary
              }`}>
              <c.icon className="h-4 w-4" /> {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Message */}
      <div className={`rounded-2xl border ${s.card} p-5 space-y-4`}>
        <h3 className={`text-sm font-semibold ${s.textPrimary}`}>Mensagem</h3>
        <div>
          <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Assunto <span className="text-red-500">*</span></label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Assunto da notificacao..."
            className={`w-full ${s.input} border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20`} />
        </div>
        <div>
          <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Corpo da Mensagem <span className="text-red-500">*</span></label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6}
            placeholder="Escreva aqui a mensagem que sera enviada..."
            className={`w-full ${s.input} border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 resize-none`} />
        </div>
      </div>

      {/* Send */}
      <div className="flex justify-end">
        <button onClick={sendNotification} disabled={sending}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl ${s.btnPrimary} text-sm font-semibold shadow-sm disabled:opacity-50`}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Enviar Notificacao
        </button>
      </div>
    </div>
  );
}
