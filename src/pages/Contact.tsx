import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, MessageCircle, Send, Clock, Loader2, CheckCircle2, ArrowLeft, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

const Contact = () => {
  const { data: settings } = useSiteSettings();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;
    setSending(true);
    try {
      await fetch(`${API}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
    } catch {}
    setSending(false);
    setSent(true);
  };

  const inputClass = "w-full rounded-xl border border-border bg-secondary/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all";

  if (sent) {
    return (
      <main className="min-h-screen bg-secondary/30 flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Mensagem Enviada!</h1>
          <p className="text-muted-foreground mb-6 text-sm">
            Obrigado por entrar em contacto. A nossa equipa ira responder o mais breve possivel.
          </p>
          <Link to="/"><Button>Voltar ao Inicio</Button></Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-secondary/30">
      {/* Hero */}
      <div className="bg-hero-gradient py-12 sm:py-16">
        <div className="container text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-11 w-11 rounded-xl bg-card/20 backdrop-blur flex items-center justify-center">
              <Mail className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-primary-foreground">Contacte-nos</h1>
          </div>
          <p className="text-primary-foreground/80 text-sm max-w-lg mx-auto">
            Tem alguma duvida, sugestao ou precisa de ajuda? Estamos aqui para si.
          </p>
        </div>
      </div>

      <div className="container py-10 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Info cards */}
          <div className="lg:col-span-2 space-y-4">
            {/* Contact cards */}
            {[
              { icon: Mail, color: "text-blue-500", bg: "bg-blue-50", title: "Email", value: settings?.contact_email || "info@superlojas.ao", link: `mailto:${settings?.contact_email || "info@superlojas.ao"}`, desc: "Resposta em ate 24h" },
              { icon: Phone, color: "text-emerald-500", bg: "bg-emerald-50", title: "Telefone", value: settings?.contact_phone || "+244 923 456 789", link: `tel:${(settings?.contact_phone || "+244923456789").replace(/\s/g, "")}`, desc: "Seg-Sex: 08h-18h" },
              { icon: MessageCircle, color: "text-green-500", bg: "bg-green-50", title: "WhatsApp", value: settings?.contact_whatsapp || settings?.contact_phone || "+244 923 456 789", link: `https://wa.me/${(settings?.contact_whatsapp || settings?.contact_phone || "244923456789").replace(/[^0-9]/g, "")}`, desc: "Resposta rapida" },
              { icon: MapPin, color: "text-orange-500", bg: "bg-orange-50", title: "Endereco", value: settings?.contact_city || "Luanda, Angola", link: undefined, desc: settings?.contact_address || "Talatona, Luanda Sul" },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-border bg-card p-5 flex items-start gap-4">
                <div className={`h-11 w-11 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-0.5">{item.title}</p>
                  {item.link ? (
                    <a href={item.link} target={item.link.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                      className="text-sm font-semibold hover:text-primary transition-colors">{item.value}</a>
                  ) : (
                    <p className="text-sm font-semibold">{item.value}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}

            {/* Hours */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-violet-500" />
                </div>
                <div>
                  <p className="text-sm font-bold">Horario de Atendimento</p>
                  <p className="text-[11px] text-muted-foreground">Fuso horario: WAT (UTC+1)</p>
                </div>
              </div>
              <div className="space-y-1.5 text-sm">
                {(settings?.contact_hours || [
                  { label: "Segunda - Sexta", hours: "08:00 - 18:00" },
                  { label: "Sabado", hours: "09:00 - 13:00" },
                  { label: "Domingo", hours: "Encerrado" },
                ]).map((h) => (
                  <div key={h.label} className="flex justify-between items-center">
                    <span className="text-muted-foreground text-xs">{h.label}</span>
                    <span className={`text-xs font-semibold ${h.hours === "Encerrado" ? "text-red-500" : ""}`}>{h.hours}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Send className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-bold">Enviar Mensagem</h2>
                  <p className="text-[11px] text-muted-foreground">Preencha o formulario abaixo</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Nome *</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" className={inputClass} required />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Email *</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className={inputClass} required />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Assunto</label>
                  <select value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClass}>
                    <option value="">Seleccionar assunto...</option>
                    <option value="duvida">Duvida Geral</option>
                    <option value="loja">Sobre Minha Loja</option>
                    <option value="compra">Problema com Compra</option>
                    <option value="sugestao">Sugestao</option>
                    <option value="parceria">Parceria / Publicidade</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Mensagem *</label>
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} placeholder="Descreva a sua duvida ou mensagem..."
                    className={`${inputClass} resize-none`} required />
                </div>

                <Button type="submit" disabled={sending || !name || !email || !message}
                  className="w-full bg-hero-gradient text-primary-foreground hover:opacity-90 gap-2 rounded-xl">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {sending ? "A enviar..." : "Enviar Mensagem"}
                </Button>
              </form>
            </div>

            {/* Quick links */}
            <div className="mt-4 rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Links Rapidos</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Como Comprar", to: "/como-comprar" },
                  { label: "FAQ", to: "/faq" },
                  { label: "Termos de Uso", to: "/termos" },
                  { label: "Abrir Minha Loja", to: "/cadastro-loja" },
                ].map((l) => (
                  <Link key={l.to} to={l.to} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                    <Store className="h-3.5 w-3.5" /> {l.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Voltar ao inicio
          </Link>
        </div>
      </div>
    </main>
  );
};

export default Contact;
