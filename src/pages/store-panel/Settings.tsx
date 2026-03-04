import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import { useEffect, useState, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Loader2, Upload, Save, Store, MessageCircle, Search as SearchIcon,
  FileText, Clock, Globe, Instagram, Facebook, Megaphone,
  Truck, MapPin, Phone, Mail, Info, ToggleLeft, ToggleRight, Package
} from "lucide-react";
import { useToastNotification } from "@/contexts/ToastContext";
import { resolveStorageUrl } from "@/lib/imageHelpers";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

const DEFAULT_HOURS = [
  { day: "Segunda", open: "08:00", close: "18:00", active: true },
  { day: "Terca", open: "08:00", close: "18:00", active: true },
  { day: "Quarta", open: "08:00", close: "18:00", active: true },
  { day: "Quinta", open: "08:00", close: "18:00", active: true },
  { day: "Sexta", open: "08:00", close: "18:00", active: true },
  { day: "Sabado", open: "08:00", close: "13:00", active: true },
  { day: "Domingo", open: "", close: "", active: false },
];

const DEFAULT_WHATSAPP_MSG = "Ola! Gostaria de fazer uma encomenda:\n\n{produtos}\n\nTotal: {total}\n\nNome: {nome}\nEndereco: {endereco}";

type TabKey = "geral" | "whatsapp" | "seo" | "politicas" | "social" | "horario";

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "geral", label: "Geral", icon: Store },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { key: "horario", label: "Horario", icon: Clock },
  { key: "seo", label: "SEO", icon: SearchIcon },
  { key: "social", label: "Redes Sociais", icon: Globe },
  { key: "politicas", label: "Politicas", icon: FileText },
];

interface FormState {
  name: string; description: string; province: string; city: string;
  whatsapp: string; email: string; phone: string;
  whatsapp_message: string; whatsapp_orders_enabled: boolean;
  show_stock: boolean;
  business_hours: typeof DEFAULT_HOURS;
  meta_title: string; meta_description: string; meta_keywords: string;
  return_policy: string; shipping_policy: string; terms: string;
  announcement: string; announcement_active: boolean;
  delivery_zones: string; min_order_value: string;
  socials: { instagram: string; facebook: string; tiktok: string; website: string };
}

const emptyForm: FormState = {
  name: "", description: "", province: "", city: "",
  whatsapp: "", email: "", phone: "",
  whatsapp_message: DEFAULT_WHATSAPP_MSG, whatsapp_orders_enabled: true,
  show_stock: true,
  business_hours: DEFAULT_HOURS,
  meta_title: "", meta_description: "", meta_keywords: "",
  return_policy: "", shipping_policy: "", terms: "",
  announcement: "", announcement_active: false,
  delivery_zones: "", min_order_value: "",
  socials: { instagram: "", facebook: "", tiktok: "", website: "" },
};

export default function StorePanelSettings() {
  const { token } = useAuth();
  const s = useAdminStyles();
  const { slug } = useOutletContext<{ slug: string }>();
  const toast = useToastNotification();
  const [tab, setTab] = useState<TabKey>("geral");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const logoRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token || !slug) return;
    fetch(`${API}/store-panel/${slug}/settings`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } })
      .then((r) => r.json())
      .then((d) => {
        setForm({
          name: d.name || "", description: d.description || "", province: d.province || "", city: d.city || "",
          whatsapp: d.whatsapp || "", email: d.email || "", phone: d.phone || "",
          whatsapp_message: d.whatsapp_message || DEFAULT_WHATSAPP_MSG,
          whatsapp_orders_enabled: d.whatsapp_orders_enabled ?? true,
          show_stock: d.show_stock ?? true,
          business_hours: d.business_hours && d.business_hours.length ? d.business_hours : DEFAULT_HOURS,
          meta_title: d.meta_title || "", meta_description: d.meta_description || "", meta_keywords: d.meta_keywords || "",
          return_policy: d.return_policy || "", shipping_policy: d.shipping_policy || "", terms: d.terms || "",
          announcement: d.announcement || "", announcement_active: d.announcement_active ?? false,
          delivery_zones: d.delivery_zones ? d.delivery_zones.join(", ") : "", min_order_value: d.min_order_value ? String(d.min_order_value) : "",
          socials: { instagram: d.socials?.instagram || "", facebook: d.socials?.facebook || "", tiktok: d.socials?.tiktok || "", website: d.socials?.website || "" },
        });
        setLogoPreview(d.logo ? resolveStorageUrl(d.logo) : "");
        setBannerPreview(d.banner ? resolveStorageUrl(d.banner) : "");
      })
      .finally(() => setLoading(false));
  }, [token, slug]);

  const save = async () => {
    setSaving(true);
    const fd = new FormData();
    fd.append("_method", "PUT");
    // Geral
    fd.append("name", form.name);
    fd.append("description", form.description);
    fd.append("province", form.province);
    fd.append("city", form.city);
    fd.append("whatsapp", form.whatsapp);
    fd.append("email", form.email);
    fd.append("phone", form.phone);
    if (logoFile) fd.append("logo", logoFile);
    if (bannerFile) fd.append("banner", bannerFile);
    // WhatsApp
    fd.append("whatsapp_message", form.whatsapp_message);
    fd.append("whatsapp_orders_enabled", form.whatsapp_orders_enabled ? "1" : "0");
    fd.append("show_stock", form.show_stock ? "1" : "0");
    // Horario
    fd.append("business_hours", JSON.stringify(form.business_hours));
    // SEO
    fd.append("meta_title", form.meta_title);
    fd.append("meta_description", form.meta_description);
    fd.append("meta_keywords", form.meta_keywords);
    // Politicas
    fd.append("return_policy", form.return_policy);
    fd.append("shipping_policy", form.shipping_policy);
    fd.append("terms", form.terms);
    // Anuncio
    fd.append("announcement", form.announcement);
    fd.append("announcement_active", form.announcement_active ? "1" : "0");
    // Entrega
    if (form.delivery_zones) fd.append("delivery_zones", JSON.stringify(form.delivery_zones.split(",").map((z: string) => z.trim()).filter(Boolean)));
    if (form.min_order_value) fd.append("min_order_value", form.min_order_value);
    // Sociais
    fd.append("socials", JSON.stringify(form.socials));
    try {
      const res = await fetch(`${API}/store-panel/${slug}/settings`, { method: "POST", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, body: fd });
      const data = await res.json();
      if (res.ok) { setLogoPreview(data.logo ? resolveStorageUrl(data.logo) : logoPreview); setBannerPreview(data.banner ? resolveStorageUrl(data.banner) : bannerPreview); toast.success("Configuracoes guardadas", "As alteracoes foram aplicadas."); }
      else { toast.error("Erro", data.errors ? (Object.values(data.errors).flat().join(", ") as string) : data.message || "Erro"); }
    } finally { setSaving(false); }
  };

  const f = (k: keyof FormState) => (form as any)[k] as string;
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const inputCls = `w-full ${s.input} border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20`;
  const labelCls = `block text-xs font-medium ${s.textSecondary} mb-1.5`;
  const cardCls = `rounded-2xl border ${s.card} p-5 space-y-5`;

  const ToggleBtn = ({ val, onChange, label }: { val: boolean; onChange: (v: boolean) => void; label: string }) => (
    <button type="button" onClick={() => onChange(!val)} className={`flex items-center gap-2 text-xs font-medium ${val ? "text-emerald-500" : s.textMuted}`}>
      {val ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />} {label}
    </button>
  );

  if (loading) return <div className="grid grid-cols-1 gap-4">{[...Array(4)].map((_, i) => <div key={i} className={`rounded-2xl border ${s.card} h-16 animate-pulse`} />)}</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-bold ${s.textPrimary}`}>Configuracoes da Loja</h2>
          <p className={`text-xs ${s.textMuted}`}>Gerir todos os detalhes da sua loja</p>
        </div>
        <button onClick={save} disabled={saving} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold ${s.btnPrimary} disabled:opacity-50 shadow-sm`}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${tab === t.key ? `${s.btnPrimary} shadow-sm` : s.btnSecondary}`}>
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Geral ── */}
      {tab === "geral" && (
        <div className={cardCls}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>Logo</label>
              <div onClick={() => logoRef.current?.click()}
                className={`h-24 w-24 rounded-xl border-2 border-dashed ${s.isDark ? "border-white/10 hover:border-white/20" : "border-gray-300 hover:border-emerald-400"} flex items-center justify-center cursor-pointer transition-colors overflow-hidden`}>
                {logoPreview ? <img src={logoPreview} alt="" className="h-full w-full object-cover" /> : <Upload className={`h-6 w-6 ${s.textMuted}`} />}
              </div>
              <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setLogoFile(f); setLogoPreview(URL.createObjectURL(f)); } }} />
            </div>
            <div>
              <label className={labelCls}>Banner</label>
              <div onClick={() => bannerRef.current?.click()}
                className={`h-24 w-full rounded-xl border-2 border-dashed ${s.isDark ? "border-white/10 hover:border-white/20" : "border-gray-300 hover:border-emerald-400"} flex items-center justify-center cursor-pointer transition-colors overflow-hidden`}>
                {bannerPreview ? <img src={bannerPreview} alt="" className="h-full w-full object-cover" /> : <Upload className={`h-6 w-6 ${s.textMuted}`} />}
              </div>
              <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setBannerFile(f); setBannerPreview(URL.createObjectURL(f)); } }} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={labelCls}>Nome da Loja</label><input value={f("name")} onChange={(e) => set("name", e.target.value)} placeholder="Minha Loja" className={inputCls} /></div>
            <div><label className={labelCls}>WhatsApp</label><input value={f("whatsapp")} onChange={(e) => set("whatsapp", e.target.value)} placeholder="+244 9XX XXX XXX" className={inputCls} /></div>
            <div><label className={labelCls}>Email</label><input type="email" value={f("email")} onChange={(e) => set("email", e.target.value)} placeholder="loja@email.com" className={inputCls} /></div>
            <div><label className={labelCls}>Telefone</label><input value={f("phone")} onChange={(e) => set("phone", e.target.value)} placeholder="+244 222 XXX XXX" className={inputCls} /></div>
            <div><label className={labelCls}>Provincia</label><input value={f("province")} onChange={(e) => set("province", e.target.value)} placeholder="Luanda" className={inputCls} /></div>
            <div><label className={labelCls}>Cidade</label><input value={f("city")} onChange={(e) => set("city", e.target.value)} placeholder="Luanda" className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>Descricao</label>
            <textarea value={f("description")} onChange={(e) => set("description", e.target.value)} rows={4} placeholder="Descricao da sua loja..." className={`${inputCls} resize-none`} />
          </div>
          {/* Show Stock Toggle */}
          <div className={`p-4 rounded-xl ${s.isDark ? "bg-blue-500/5 border border-blue-500/10" : "bg-blue-50 border border-blue-100"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-500" />
                <div>
                  <span className={`text-xs font-semibold ${s.textPrimary}`}>Mostrar Stock dos Produtos</span>
                  <p className={`text-[10px] ${s.textMuted}`}>Quando activo, os clientes veem a quantidade disponivel na pagina do produto.</p>
                </div>
              </div>
              <ToggleBtn val={form.show_stock} onChange={(v) => setForm((p) => ({ ...p, show_stock: v }))} label={form.show_stock ? "Visivel" : "Oculto"} />
            </div>
          </div>

          {/* Announcement */}
          <div className={`p-4 rounded-xl ${s.isDark ? "bg-amber-500/5 border border-amber-500/10" : "bg-amber-50 border border-amber-100"}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-amber-500" />
                <span className={`text-xs font-semibold ${s.textPrimary}`}>Anuncio da Loja</span>
              </div>
              <ToggleBtn val={form.announcement_active} onChange={(v) => setForm((p) => ({ ...p, announcement_active: v }))} label={form.announcement_active ? "Activo" : "Inactivo"} />
            </div>
            <input value={f("announcement")} onChange={(e) => set("announcement", e.target.value)} placeholder="Ex: Promocao de Natal — 20% desconto em tudo!" className={inputCls} />
            <p className={`text-[10px] ${s.textMuted} mt-1.5`}>Aparece como banner no topo da sua loja quando activo.</p>
          </div>
        </div>
      )}

      {/* ── TAB: WhatsApp ── */}
      {tab === "whatsapp" && (
        <div className={cardCls}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center"><MessageCircle className="h-5 w-5 text-green-500" /></div>
              <div>
                <p className={`text-sm font-semibold ${s.textPrimary}`}>Encomendas via WhatsApp</p>
                <p className={`text-[10px] ${s.textMuted}`}>Configure como os clientes enviam encomendas</p>
              </div>
            </div>
            <ToggleBtn val={form.whatsapp_orders_enabled} onChange={(v) => setForm((p) => ({ ...p, whatsapp_orders_enabled: v }))} label={form.whatsapp_orders_enabled ? "Activo" : "Desligado"} />
          </div>
          <div>
            <label className={labelCls}>Numero WhatsApp para Encomendas</label>
            <input value={f("whatsapp")} onChange={(e) => set("whatsapp", e.target.value)} placeholder="+244 9XX XXX XXX" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Mensagem Modelo de Encomenda</label>
            <textarea value={form.whatsapp_message} onChange={(e) => set("whatsapp_message", e.target.value)} rows={6} className={`${inputCls} resize-none font-mono text-xs`} />
            <div className={`mt-2 p-3 rounded-xl ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}>
              <p className={`text-[10px] font-semibold ${s.textSecondary} mb-1`}>Variaveis disponiveis:</p>
              <div className="flex flex-wrap gap-1.5">
                {["{produtos}", "{total}", "{nome}", "{endereco}", "{telefone}", "{email}", "{notas}"].map((v) => (
                  <span key={v} className={`px-2 py-0.5 rounded-md text-[10px] font-mono ${s.isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-700"}`}>{v}</span>
                ))}
              </div>
            </div>
          </div>
          {/* Delivery config */}
          <div className={`pt-4 border-t ${s.borderLight} space-y-4`}>
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-blue-500" />
              <span className={`text-xs font-semibold ${s.textPrimary}`}>Configuracoes de Entrega</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Valor Minimo de Encomenda (Kz)</label>
                <input type="number" value={form.min_order_value} onChange={(e) => set("min_order_value", e.target.value)} placeholder="0" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Zonas de Entrega</label>
                <input value={form.delivery_zones} onChange={(e) => set("delivery_zones", e.target.value)} placeholder="Luanda, Viana, Cacuaco" className={inputCls} />
                <p className={`text-[10px] ${s.textMuted} mt-1`}>Separe por virgulas</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Horario ── */}
      {tab === "horario" && (
        <div className={cardCls}>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-orange-500" />
            <span className={`text-sm font-semibold ${s.textPrimary}`}>Horario de Funcionamento</span>
          </div>
          <p className={`text-[10px] ${s.textMuted} -mt-3`}>Defina os dias e horas que a sua loja esta aberta.</p>
          <div className="space-y-2">
            {form.business_hours.map((h, i) => (
              <div key={h.day} className={`flex items-center gap-3 px-4 py-3 rounded-xl ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}>
                <button type="button" onClick={() => {
                  const hrs = [...form.business_hours];
                  hrs[i] = { ...hrs[i], active: !hrs[i].active };
                  setForm((p) => ({ ...p, business_hours: hrs }));
                }} className={`${h.active ? "text-emerald-500" : s.textMuted}`}>
                  {h.active ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                </button>
                <span className={`text-xs font-medium w-20 ${h.active ? s.textPrimary : s.textMuted}`}>{h.day}</span>
                {h.active ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input type="time" value={h.open} onChange={(e) => {
                      const hrs = [...form.business_hours];
                      hrs[i] = { ...hrs[i], open: e.target.value };
                      setForm((p) => ({ ...p, business_hours: hrs }));
                    }} className={`${inputCls} max-w-[120px] text-xs`} />
                    <span className={`text-xs ${s.textMuted}`}>ate</span>
                    <input type="time" value={h.close} onChange={(e) => {
                      const hrs = [...form.business_hours];
                      hrs[i] = { ...hrs[i], close: e.target.value };
                      setForm((p) => ({ ...p, business_hours: hrs }));
                    }} className={`${inputCls} max-w-[120px] text-xs`} />
                  </div>
                ) : (
                  <span className={`text-xs ${s.textMuted} italic`}>Fechado</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB: SEO ── */}
      {tab === "seo" && (
        <div className={cardCls}>
          <div className="flex items-center gap-2 mb-1">
            <SearchIcon className="h-4 w-4 text-purple-500" />
            <span className={`text-sm font-semibold ${s.textPrimary}`}>SEO — Optimizacao para Motores de Busca</span>
          </div>
          <p className={`text-[10px] ${s.textMuted} -mt-3`}>Melhore a visibilidade da sua loja no Google e redes sociais.</p>

          <div>
            <label className={labelCls}>Titulo SEO <span className={`font-normal ${s.textMuted}`}>({form.meta_title.length}/70)</span></label>
            <input value={f("meta_title")} onChange={(e) => set("meta_title", e.target.value.slice(0, 70))} placeholder={form.name || "Nome da Loja — Produtos em Angola"} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Descricao SEO <span className={`font-normal ${s.textMuted}`}>({form.meta_description.length}/160)</span></label>
            <textarea value={form.meta_description} onChange={(e) => set("meta_description", e.target.value.slice(0, 160))} rows={3} placeholder="Descricao curta da loja para aparecer nos resultados de pesquisa..." className={`${inputCls} resize-none`} />
          </div>
          <div>
            <label className={labelCls}>Palavras-chave</label>
            <input value={f("meta_keywords")} onChange={(e) => set("meta_keywords", e.target.value)} placeholder="roupa angola, moda kwanza, loja online luanda" className={inputCls} />
            <p className={`text-[10px] ${s.textMuted} mt-1`}>Separe por virgulas. Ex: electronica, smartphones, angola</p>
          </div>

          {/* Google Preview */}
          <div className={`p-4 rounded-xl ${s.isDark ? "bg-white/[0.03] border border-white/[0.06]" : "bg-white border border-gray-200"}`}>
            <p className={`text-[10px] font-semibold ${s.textMuted} uppercase tracking-wider mb-2`}>Pre-visualizacao no Google</p>
            <div>
              <p className="text-blue-600 text-sm font-medium truncate">{form.meta_title || form.name || "Nome da Loja"} — SuperLojas</p>
              <p className="text-green-700 text-[11px] truncate">superlojas.ao/lojas/{slug}</p>
              <p className={`text-xs ${s.textMuted} line-clamp-2 mt-0.5`}>{form.meta_description || form.description || "Descricao da loja aparece aqui..."}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Redes Sociais ── */}
      {tab === "social" && (
        <div className={cardCls}>
          <div className="flex items-center gap-2 mb-1">
            <Globe className="h-4 w-4 text-blue-500" />
            <span className={`text-sm font-semibold ${s.textPrimary}`}>Redes Sociais</span>
          </div>
          <p className={`text-[10px] ${s.textMuted} -mt-3`}>Adicione links para as suas redes sociais. Aparecem na pagina publica da loja.</p>
          <div className="space-y-4">
            {[
              { k: "instagram", label: "Instagram", icon: Instagram, p: "https://instagram.com/minhaloja", color: "text-pink-500" },
              { k: "facebook", label: "Facebook", icon: Facebook, p: "https://facebook.com/minhaloja", color: "text-blue-600" },
              { k: "tiktok", label: "TikTok", icon: Globe, p: "https://tiktok.com/@minhaloja", color: "text-gray-800" },
              { k: "website", label: "Website", icon: Globe, p: "https://minhaloja.ao", color: "text-emerald-500" },
            ].map((net) => (
              <div key={net.k} className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"} flex items-center justify-center shrink-0`}>
                  <net.icon className={`h-5 w-5 ${net.color}`} />
                </div>
                <div className="flex-1">
                  <label className={labelCls}>{net.label}</label>
                  <input value={(form.socials as any)[net.k]} onChange={(e) => setForm((p) => ({ ...p, socials: { ...p.socials, [net.k]: e.target.value } }))} placeholder={net.p} className={inputCls} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB: Politicas ── */}
      {tab === "politicas" && (
        <div className={cardCls}>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-indigo-500" />
            <span className={`text-sm font-semibold ${s.textPrimary}`}>Politicas da Loja</span>
          </div>
          <p className={`text-[10px] ${s.textMuted} -mt-3`}>Defina as politicas que aparecem na pagina da sua loja. Ajuda a construir confianca com os clientes.</p>
          {[
            { k: "return_policy", label: "Politica de Devolucoes", p: "Aceita devolucoes em 7 dias se o produto estiver em boas condicoes..." },
            { k: "shipping_policy", label: "Politica de Envio", p: "Entrega em Luanda: 1-2 dias uteis. Provincias: 3-7 dias uteis..." },
            { k: "terms", label: "Termos e Condicoes", p: "Ao comprar na nossa loja, concorda com os seguintes termos..." },
          ].map((pol) => (
            <div key={pol.k}>
              <label className={labelCls}>{pol.label}</label>
              <textarea value={(form as any)[pol.k]} onChange={(e) => set(pol.k, e.target.value)} rows={5} placeholder={pol.p} className={`${inputCls} resize-none`} />
            </div>
          ))}
        </div>
      )}

      {/* Bottom save button (mobile friendly) */}
      <div className="flex justify-end pb-4">
        <button onClick={save} disabled={saving} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold ${s.btnPrimary} disabled:opacity-50 shadow-sm`}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar Todas as Alteracoes
        </button>
      </div>
    </div>
  );
}
