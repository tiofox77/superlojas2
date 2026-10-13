import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Megaphone, Send, Users, Store, Loader2, CheckCircle2, Mail, MessageSquare, Bell, Smartphone, Link2, Image } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

type Channel = "email" | "sms" | "both";
type Audience = "all" | "customers" | "store_owners" | "specific";
type TabType = "email" | "push";

export default function AdminNotifications() {
  const { token } = useAuth();
  const s = useAdminStyles();
  const [tab, setTab] = useState<TabType>("push");
  const [audience, setAudience] = useState<Audience>("all");
  const [channel, setChannel] = useState<Channel>("email");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [specificEmails, setSpecificEmails] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Push notification state
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [pushUrl, setPushUrl] = useState("/");
  const [pushImage, setPushImage] = useState("");
  const [pushSending, setPushSending] = useState(false);
  const [pushSuccess, setPushSuccess] = useState(false);
  const [pushError, setPushError] = useState("");
  const [pushResult, setPushResult] = useState<{ sent: number; failed: number; removed: number } | null>(null);
  const [subscriberCount, setSubscriberCount] = useState<{ total: number; with_user: number; anonymous: number } | null>(null);

  // Load subscriber count
  useEffect(() => {
    if (!token) return;
    fetch(`${API}/admin/push/subscribers`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } })
      .then((r) => r.json())
      .then(setSubscriberCount)
      .catch(() => {});
  }, [token, pushSuccess]);

  const sendPushNotification = async () => {
    if (!pushTitle || !pushBody) { setPushError("Titulo e mensagem sao obrigatorios."); return; }
    setPushSending(true); setPushError(""); setPushSuccess(false); setPushResult(null);
    try {
      const res = await fetch(`${API}/admin/push/send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ title: pushTitle, body: pushBody, url: pushUrl || "/", image: pushImage || null }),
      });
      const data = await res.json();
      if (res.ok) {
        setPushSuccess(true);
        setPushResult({ sent: data.sent, failed: data.failed, removed: data.removed });
        setPushTitle(""); setPushBody(""); setPushUrl("/"); setPushImage("");
        setTimeout(() => setPushSuccess(false), 8000);
      } else {
        setPushError(data.message || "Erro ao enviar push.");
      }
    } catch { setPushError("Erro de conexao."); }
    finally { setPushSending(false); }
  };

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

  const inputCls = `w-full ${s.input} border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20`;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className={`text-lg font-bold ${s.textPrimary}`}>Enviar Notificacoes</h2>
        <p className={`text-xs ${s.textMuted}`}>Notificar clientes, lojistas ou utilizadores especificos</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        <button onClick={() => setTab("push")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            tab === "push" ? `${s.btnPrimary} shadow-sm` : s.btnSecondary
          }`}>
          <Bell className="h-4 w-4" /> Push (Telemovel)
        </button>
        <button onClick={() => setTab("email")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            tab === "email" ? `${s.btnPrimary} shadow-sm` : s.btnSecondary
          }`}>
          <Mail className="h-4 w-4" /> Email / SMS
        </button>
      </div>

      {/* ═══════════ PUSH TAB ═══════════ */}
      {tab === "push" && (
        <div className="space-y-5">
          {/* Subscriber stats */}
          {subscriberCount && (
            <div className="grid grid-cols-3 gap-3">
              <div className={`rounded-xl border ${s.card} p-4 text-center`}>
                <Smartphone className="h-5 w-5 mx-auto mb-1.5 text-orange-500" />
                <p className={`text-xl font-bold ${s.textPrimary}`}>{subscriberCount.total}</p>
                <p className={`text-[10px] ${s.textMuted}`}>Total Subscritores</p>
              </div>
              <div className={`rounded-xl border ${s.card} p-4 text-center`}>
                <Users className="h-5 w-5 mx-auto mb-1.5 text-blue-500" />
                <p className={`text-xl font-bold ${s.textPrimary}`}>{subscriberCount.with_user}</p>
                <p className={`text-[10px] ${s.textMuted}`}>Com Conta</p>
              </div>
              <div className={`rounded-xl border ${s.card} p-4 text-center`}>
                <Users className="h-5 w-5 mx-auto mb-1.5 text-gray-400" />
                <p className={`text-xl font-bold ${s.textPrimary}`}>{subscriberCount.anonymous}</p>
                <p className={`text-[10px] ${s.textMuted}`}>Anonimos</p>
              </div>
            </div>
          )}

          {pushSuccess && pushResult && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm">
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
              <span>Push enviado! <strong>{pushResult.sent}</strong> entregues, <strong>{pushResult.failed}</strong> falharam, <strong>{pushResult.removed}</strong> expirados removidos.</span>
            </motion.div>
          )}

          {pushError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">{pushError}</div>
          )}

          {/* Push form */}
          <div className={`rounded-2xl border ${s.card} p-5 space-y-4`}>
            <div className="flex items-center gap-2 mb-1">
              <Bell className="h-4 w-4 text-orange-500" />
              <h3 className={`text-sm font-semibold ${s.textPrimary}`}>Notificacao Push</h3>
            </div>
            <div>
              <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Titulo <span className="text-red-500">*</span></label>
              <input value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} placeholder="Ex: Nova coleccao disponivel!"
                className={inputCls} maxLength={100} />
            </div>
            <div>
              <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Mensagem <span className="text-red-500">*</span></label>
              <textarea value={pushBody} onChange={(e) => setPushBody(e.target.value)} rows={3}
                placeholder="Ex: Confira os novos produtos com ate 50% de desconto..."
                className={`${inputCls} resize-none`} maxLength={500} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>
                  <Link2 className="inline h-3 w-3 mr-1" />URL ao Clicar
                </label>
                <input value={pushUrl} onChange={(e) => setPushUrl(e.target.value)} placeholder="/ ou /ofertas ou /produto/slug"
                  className={inputCls} />
              </div>
              <div>
                <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>
                  <Image className="inline h-3 w-3 mr-1" />Imagem (URL opcional)
                </label>
                <input value={pushImage} onChange={(e) => setPushImage(e.target.value)} placeholder="https://..."
                  className={inputCls} />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className={`rounded-2xl border ${s.card} p-5`}>
            <p className={`text-[10px] font-semibold ${s.textMuted} uppercase tracking-wider mb-3`}>Pre-visualizacao</p>
            <div className={`rounded-xl border ${s.isDark ? "border-white/10 bg-white/[0.03]" : "border-gray-200 bg-gray-50"} p-4 flex gap-3`}>
              <div className="h-10 w-10 rounded-lg bg-orange-500 flex items-center justify-center shrink-0">
                <Bell className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${s.textPrimary} truncate`}>{pushTitle || "Titulo da notificacao"}</p>
                <p className={`text-xs ${s.textMuted} line-clamp-2 mt-0.5`}>{pushBody || "Corpo da mensagem..."}</p>
                {pushUrl && pushUrl !== "/" && (
                  <p className="text-[10px] text-blue-500 mt-1 truncate">{pushUrl}</p>
                )}
              </div>
              {pushImage && (
                <img src={pushImage} alt="" className="h-14 w-14 rounded-lg object-cover shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={sendPushNotification} disabled={pushSending || !subscriberCount?.total}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl ${s.btnPrimary} text-sm font-semibold shadow-sm disabled:opacity-50`}>
              {pushSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar Push ({subscriberCount?.total || 0} dispositivos)
            </button>
          </div>
        </div>
      )}

      {/* ═══════════ EMAIL/SMS TAB ═══════════ */}
      {tab === "email" && (
        <div className="space-y-5">
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
                  className={`${inputCls} resize-none`} />
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
                className={inputCls} />
            </div>
            <div>
              <label className={`block text-xs font-medium ${s.textSecondary} mb-1.5`}>Corpo da Mensagem <span className="text-red-500">*</span></label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6}
                placeholder="Escreva aqui a mensagem que sera enviada..."
                className={`${inputCls} resize-none`} />
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
      )}
    </div>
  );
}
