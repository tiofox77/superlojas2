import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import { useEffect, useState } from "react";
import {
  Settings, Mail, MessageSquare, Loader2, CheckCircle2, Eye, EyeOff, Send, Store,
  ToggleLeft, ToggleRight, Shield, Megaphone, Phone, MapPin, Globe, Instagram, Facebook,
  Clock, Plus, Trash2, GripVertical, Volume2, AlertTriangle, ShoppingBag, Package, Ban,
  Upload, Image, Search, BarChart3, Code, ExternalLink, FileCode, Smartphone, Palette, Monitor
} from "lucide-react";
import { useRef } from "react";
import { useToastNotification } from "@/contexts/ToastContext";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

// ─── Stable sub-components (defined outside to avoid re-creation on every render) ───
const ToggleBtnStable = ({ val, onChange, label, textMuted }: { val: boolean; onChange: (v: boolean) => void; label: string; textMuted: string }) => (
  <button type="button" onClick={() => onChange(!val)} className={`flex items-center gap-2 text-xs font-medium ${val ? "text-emerald-500" : textMuted}`}>
    {val ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />} {label}
  </button>
);

const SectionHeaderStable = ({ icon: Icon, color, title, desc, isDark, textPrimary, textMuted }: {
  icon: React.ElementType; color: string; title: string; desc: string; isDark: boolean; textPrimary: string; textMuted: string;
}) => (
  <div className="flex items-center gap-3 mb-2">
    <div className={`h-10 w-10 rounded-xl ${isDark ? `${color.replace("text-", "bg-")}/10` : `${color.replace("text-", "bg-")}/10`} flex items-center justify-center`}>
      <Icon className={`h-5 w-5 ${color}`} />
    </div>
    <div>
      <h3 className={`text-sm font-bold ${textPrimary}`}>{title}</h3>
      <p className={`text-[11px] ${textMuted}`}>{desc}</p>
    </div>
  </div>
);

const SaveBtnStable = ({ onClick, saving, label = "Guardar", btnPrimary }: { onClick: () => void; saving: boolean; label?: string; btnPrimary: string }) => (
  <div className="flex justify-end pt-3">
    <button onClick={onClick} disabled={saving} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold ${btnPrimary} disabled:opacity-50 shadow-sm`}>
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {label}
    </button>
  </div>
);

const InputFieldStable = ({ label, value, onChange, type = "text", placeholder = "", required = false, hint = "", inputCls, labelCls, textMuted, children }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean; hint?: string;
  inputCls: string; labelCls: string; textMuted: string; children?: React.ReactNode;
}) => (
  <div>
    <label className={labelCls}>{label} {required && <span className="text-red-500">*</span>}</label>
    <div className="relative">
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
      {children}
    </div>
    {hint && <p className={`text-[10px] ${textMuted} mt-1`}>{hint}</p>}
  </div>
);

interface SmtpConfig { host: string; port: string; username: string; password: string; encryption: string; from_address: string; from_name: string; timeout: string; auth_mode: string; verify_peer: string; }
interface SmsConfig { provider: string; api_key: string; api_secret: string; sender_id: string; base_url: string; }

const defaultSmtp: SmtpConfig = { host: "", port: "587", username: "", password: "", encryption: "tls", from_address: "", from_name: "SuperLojas", timeout: "30", auth_mode: "auto", verify_peer: "true" };
const defaultSms: SmsConfig = { provider: "twilio", api_key: "", api_secret: "", sender_id: "", base_url: "" };

type TabKey = "general" | "seo" | "marquee" | "contact" | "social" | "restrictions" | "smtp" | "sms" | "pwa";

const TABS: { key: TabKey; label: string; icon: React.ElementType; color: string }[] = [
  { key: "general", label: "Geral", icon: Settings, color: "text-purple-500" },
  { key: "seo", label: "SEO", icon: Search, color: "text-green-500" },
  { key: "marquee", label: "Publicidade", icon: Megaphone, color: "text-amber-500" },
  { key: "contact", label: "Contactos", icon: Phone, color: "text-blue-500" },
  { key: "social", label: "Redes Sociais", icon: Globe, color: "text-pink-500" },
  { key: "restrictions", label: "Restricoes", icon: Shield, color: "text-red-500" },
  { key: "smtp", label: "SMTP", icon: Mail, color: "text-cyan-500" },
  { key: "sms", label: "SMS", icon: MessageSquare, color: "text-emerald-500" },
  { key: "pwa", label: "PWA", icon: Smartphone, color: "text-indigo-500" },
];

export default function AdminSettings() {
  const { token } = useAuth();
  const s = useAdminStyles();
  const toast = useToastNotification();
  const [tab, setTab] = useState<TabKey>("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingConn, setTestingConn] = useState(false);
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [showSmsKey, setShowSmsKey] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  // ─── General ───
  const [siteName, setSiteName] = useState("SuperLojas");
  const [siteDescription, setSiteDescription] = useState("");
  const [storeAutoApprove, setStoreAutoApprove] = useState(false);
  const [categoryThemesEnabled, setCategoryThemesEnabled] = useState(true);
  const [siteLogo, setSiteLogo] = useState("");
  const [siteFavicon, setSiteFavicon] = useState("");
  const [uploading, setUploading] = useState("");
  const [logoNavbarHeight, setLogoNavbarHeight] = useState(40);
  const [logoFooterHeight, setLogoFooterHeight] = useState(32);
  const logoRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);

  // ─── SEO ───
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");
  const [seoOgImage, setSeoOgImage] = useState("");
  const [seoRobots, setSeoRobots] = useState("index, follow");
  const [seoCanonical, setSeoCanonical] = useState("");
  const [seoGaId, setSeoGaId] = useState("");
  const [seoGtmId, setSeoGtmId] = useState("");
  const [seoFbPixel, setSeoFbPixel] = useState("");
  const [seoHeadScripts, setSeoHeadScripts] = useState("");

  // ─── Marquee ───
  const [marqueeActive, setMarqueeActive] = useState(true);
  const [marqueeSpeed, setMarqueeSpeed] = useState("30");
  const [marqueeMessages, setMarqueeMessages] = useState<string[]>([]);
  const [newMarqueeMsg, setNewMarqueeMsg] = useState("");

  // ─── Contact ───
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactWhatsapp, setContactWhatsapp] = useState("");
  const [contactAddress, setContactAddress] = useState("");
  const [contactCity, setContactCity] = useState("Luanda, Angola");
  const [contactHours, setContactHours] = useState([
    { label: "Segunda - Sexta", hours: "08:00 - 18:00" },
    { label: "Sabado", hours: "09:00 - 13:00" },
    { label: "Domingo", hours: "Encerrado" },
  ]);

  // ─── Social ───
  const [socialInstagram, setSocialInstagram] = useState("");
  const [socialFacebook, setSocialFacebook] = useState("");
  const [socialTiktok, setSocialTiktok] = useState("");
  const [socialYoutube, setSocialYoutube] = useState("");
  const [socialTwitter, setSocialTwitter] = useState("");
  const [socialLinkedin, setSocialLinkedin] = useState("");
  const [socialWebsite, setSocialWebsite] = useState("");

  // ─── Restrictions ───
  const [maxProductsPerStore, setMaxProductsPerStore] = useState("");
  const [maxImagesPerProduct, setMaxImagesPerProduct] = useState("5");
  const [maxFileSize, setMaxFileSize] = useState("4");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [storeRegistrationEnabled, setStoreRegistrationEnabled] = useState(true);
  const [categoryCooldownDays, setCategoryCooldownDays] = useState("30");

  // ─── SMTP / SMS ───
  const [smtp, setSmtp] = useState<SmtpConfig>(defaultSmtp);
  const [sms, setSms] = useState<SmsConfig>(defaultSms);

  // ─── PWA ───
  const [pwaEnabled, setPwaEnabled] = useState(true);
  const [pwaName, setPwaName] = useState("");
  const [pwaShortName, setPwaShortName] = useState("");
  const [pwaDescription, setPwaDescription] = useState("");
  const [pwaThemeColor, setPwaThemeColor] = useState("#10b981");
  const [pwaBgColor, setPwaBgColor] = useState("#ffffff");
  const [pwaDisplay, setPwaDisplay] = useState("standalone");
  const [pwaStartUrl, setPwaStartUrl] = useState("/");
  const [pwaIcon192, setPwaIcon192] = useState("");
  const [pwaIcon512, setPwaIcon512] = useState("");
  const pwaIcon192Ref = useRef<HTMLInputElement>(null);
  const pwaIcon512Ref = useRef<HTMLInputElement>(null);

  // ─── Load all settings ───
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`${API}/admin/settings`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } })
      .then((r) => r.json())
      .then((d) => {
        // General
        if (d.site_name) setSiteName(d.site_name);
        if (d.site_description) setSiteDescription(d.site_description);
        setStoreAutoApprove(d.store_auto_approve === 'true');
        setCategoryThemesEnabled((d.category_themes_enabled ?? 'true') === 'true');
        // Marquee
        setMarqueeActive((d.marquee_active ?? 'true') === 'true');
        if (d.marquee_speed) setMarqueeSpeed(d.marquee_speed);
        try { const msgs = JSON.parse(d.marquee_messages || '[]'); if (Array.isArray(msgs)) setMarqueeMessages(msgs); } catch {}
        // Contact
        if (d.contact_email) setContactEmail(d.contact_email);
        if (d.contact_phone) setContactPhone(d.contact_phone);
        if (d.contact_whatsapp) setContactWhatsapp(d.contact_whatsapp);
        if (d.contact_address) setContactAddress(d.contact_address);
        if (d.contact_city) setContactCity(d.contact_city);
        try { const hrs = JSON.parse(d.contact_hours || '[]'); if (Array.isArray(hrs) && hrs.length) setContactHours(hrs); } catch {}
        // Social
        if (d.social_instagram) setSocialInstagram(d.social_instagram);
        if (d.social_facebook) setSocialFacebook(d.social_facebook);
        if (d.social_tiktok) setSocialTiktok(d.social_tiktok);
        if (d.social_youtube) setSocialYoutube(d.social_youtube);
        if (d.social_twitter) setSocialTwitter(d.social_twitter);
        if (d.social_linkedin) setSocialLinkedin(d.social_linkedin);
        if (d.social_website) setSocialWebsite(d.social_website);
        // Restrictions
        if (d.max_products_per_store) setMaxProductsPerStore(d.max_products_per_store);
        if (d.max_images_per_product) setMaxImagesPerProduct(d.max_images_per_product);
        if (d.max_file_size) setMaxFileSize(d.max_file_size);
        setMaintenanceMode(d.maintenance_mode === 'true');
        setRegistrationEnabled((d.registration_enabled ?? 'true') === 'true');
        setStoreRegistrationEnabled((d.store_registration_enabled ?? 'true') === 'true');
        if (d.category_change_cooldown_days) setCategoryCooldownDays(d.category_change_cooldown_days);
        // General images
        if (d.site_logo) setSiteLogo(d.site_logo);
        if (d.site_favicon) setSiteFavicon(d.site_favicon);
        if (d.logo_navbar_height) setLogoNavbarHeight(parseInt(d.logo_navbar_height) || 40);
        if (d.logo_footer_height) setLogoFooterHeight(parseInt(d.logo_footer_height) || 32);
        // SEO
        if (d.seo_title) setSeoTitle(d.seo_title);
        if (d.seo_description) setSeoDescription(d.seo_description);
        if (d.seo_keywords) setSeoKeywords(d.seo_keywords);
        if (d.seo_og_image) setSeoOgImage(d.seo_og_image);
        if (d.seo_robots) setSeoRobots(d.seo_robots);
        if (d.seo_canonical) setSeoCanonical(d.seo_canonical);
        if (d.seo_ga_id) setSeoGaId(d.seo_ga_id);
        if (d.seo_gtm_id) setSeoGtmId(d.seo_gtm_id);
        if (d.seo_fb_pixel) setSeoFbPixel(d.seo_fb_pixel);
        if (d.seo_head_scripts) setSeoHeadScripts(d.seo_head_scripts);
        // SMTP / SMS
        try { if (d.smtp) setSmtp({ ...defaultSmtp, ...JSON.parse(d.smtp) }); } catch {}
        try { if (d.sms) setSms({ ...defaultSms, ...JSON.parse(d.sms) }); } catch {}
        // PWA
        setPwaEnabled((d.pwa_enabled ?? 'true') === 'true');
        if (d.pwa_name) setPwaName(d.pwa_name);
        if (d.pwa_short_name) setPwaShortName(d.pwa_short_name);
        if (d.pwa_description) setPwaDescription(d.pwa_description);
        if (d.pwa_theme_color) setPwaThemeColor(d.pwa_theme_color);
        if (d.pwa_bg_color) setPwaBgColor(d.pwa_bg_color);
        if (d.pwa_display) setPwaDisplay(d.pwa_display);
        if (d.pwa_start_url) setPwaStartUrl(d.pwa_start_url);
        if (d.pwa_icon_192) setPwaIcon192(d.pwa_icon_192);
        if (d.pwa_icon_512) setPwaIcon512(d.pwa_icon_512);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  // ─── Save helpers ───
  const saveKV = async (settings: Record<string, string>) => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/admin/settings`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (res.ok) toast.success("Configuracoes guardadas");
      else { const d = await res.json(); toast.error("Erro", d.message || "Nao foi possivel guardar."); }
    } catch { toast.error("Erro de conexao"); }
    finally { setSaving(false); }
  };

  const saveGeneral = () => saveKV({
    site_name: siteName,
    site_description: siteDescription,
    store_auto_approve: storeAutoApprove ? 'true' : 'false',
    category_themes_enabled: categoryThemesEnabled ? 'true' : 'false',
    logo_navbar_height: String(logoNavbarHeight),
    logo_footer_height: String(logoFooterHeight),
  });

  const saveMarquee = () => saveKV({
    marquee_active: marqueeActive ? 'true' : 'false',
    marquee_speed: marqueeSpeed,
    marquee_messages: JSON.stringify(marqueeMessages),
  });

  const saveContact = () => saveKV({
    contact_email: contactEmail,
    contact_phone: contactPhone,
    contact_whatsapp: contactWhatsapp,
    contact_address: contactAddress,
    contact_city: contactCity,
    contact_hours: JSON.stringify(contactHours),
  });

  const saveSocial = () => saveKV({
    social_instagram: socialInstagram,
    social_facebook: socialFacebook,
    social_tiktok: socialTiktok,
    social_youtube: socialYoutube,
    social_twitter: socialTwitter,
    social_linkedin: socialLinkedin,
    social_website: socialWebsite,
  });

  const saveRestrictions = () => saveKV({
    max_products_per_store: maxProductsPerStore,
    max_images_per_product: maxImagesPerProduct,
    max_file_size: maxFileSize,
    maintenance_mode: maintenanceMode ? 'true' : 'false',
    registration_enabled: registrationEnabled ? 'true' : 'false',
    store_registration_enabled: storeRegistrationEnabled ? 'true' : 'false',
    category_change_cooldown_days: categoryCooldownDays,
  });

  const saveSeo = () => saveKV({
    seo_title: seoTitle, seo_description: seoDescription, seo_keywords: seoKeywords,
    seo_og_image: seoOgImage, seo_robots: seoRobots, seo_canonical: seoCanonical,
    seo_ga_id: seoGaId, seo_gtm_id: seoGtmId, seo_fb_pixel: seoFbPixel, seo_head_scripts: seoHeadScripts,
  });

  const uploadFile = async (file: File, type: "site_logo" | "site_favicon") => {
    setUploading(type);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", type);
      const res = await fetch(`${API}/admin/settings/upload`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, body: fd,
      });
      const d = await res.json();
      if (res.ok) {
        if (type === "site_logo") setSiteLogo(d.url);
        else setSiteFavicon(d.url);
        toast.success(type === "site_logo" ? "Logo carregado" : "Favicon carregado");
      } else toast.error("Erro", d.message || "Erro ao carregar ficheiro.");
    } catch { toast.error("Erro de conexao"); }
    finally { setUploading(""); }
  };

  const saveSmtp = () => saveKV({ smtp: JSON.stringify(smtp) });
  const saveSms = () => saveKV({ sms: JSON.stringify(sms) });

  const savePwa = () => saveKV({
    pwa_enabled: pwaEnabled ? 'true' : 'false',
    pwa_name: pwaName,
    pwa_short_name: pwaShortName,
    pwa_description: pwaDescription,
    pwa_theme_color: pwaThemeColor,
    pwa_bg_color: pwaBgColor,
    pwa_display: pwaDisplay,
    pwa_start_url: pwaStartUrl,
  });

  const uploadPwaIcon = async (file: File, type: "pwa_icon_192" | "pwa_icon_512") => {
    setUploading(type);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", type);
      const res = await fetch(`${API}/admin/settings/upload`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, body: fd,
      });
      const d = await res.json();
      if (res.ok) {
        if (type === "pwa_icon_192") setPwaIcon192(d.url);
        else setPwaIcon512(d.url);
        toast.success(type === "pwa_icon_192" ? "Icone 192x192 carregado" : "Icone 512x512 carregado");
      } else toast.error("Erro", d.message || "Erro ao carregar icone.");
    } catch { toast.error("Erro de conexao"); }
    finally { setUploading(""); }
  };

  const testSmtp = async () => {
    if (!testEmail) { toast.error("Insira um email para teste."); return; }
    setTesting(true);
    try {
      const res = await fetch(`${API}/admin/settings/test-email`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail }),
      });
      const d = await res.json();
      if (res.ok) toast.success("Email enviado", d.message || `Teste enviado para ${testEmail}`);
      else toast.error("Erro SMTP", d.message || "Erro ao enviar.");
    } catch { toast.error("Erro de conexao"); }
    finally { setTesting(false); }
  };

  const testConn = async () => {
    setTestingConn(true);
    try {
      const res = await fetch(`${API}/admin/settings/test-connection`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
      });
      const d = await res.json();
      if (res.ok) toast.success("Conexao OK", d.message || "Ligacao SMTP estabelecida.");
      else toast.error("Falha na conexao", d.message || "Nao foi possivel ligar ao servidor SMTP.");
    } catch { toast.error("Erro de conexao"); }
    finally { setTestingConn(false); }
  };

  // ─── Helpers ───
  const inputCls = `w-full ${s.input} border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all`;
  const labelCls = `block text-xs font-medium ${s.textSecondary} mb-1.5`;
  const cardCls = `rounded-2xl border ${s.card} p-6 space-y-5`;

  if (loading) return (
    <div className="space-y-4 max-w-3xl">
      {[...Array(3)].map((_, i) => (
        <div key={i} className={`rounded-2xl border ${s.card} p-6 animate-pulse`}>
          <div className={`h-5 w-40 ${s.skeleton} rounded mb-4`} />
          <div className="grid grid-cols-2 gap-4"><div className={`h-10 ${s.skeleton} rounded-xl`} /><div className={`h-10 ${s.skeleton} rounded-xl`} /></div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className={`text-lg font-bold ${s.textPrimary}`}>Configuracoes da Plataforma</h2>
        <p className={`text-xs ${s.textMuted}`}>Gerir todas as configuracoes do SuperLojas</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 pb-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              tab === t.key ? "bg-orange-500 text-white shadow-sm" : s.btnSecondary
            }`}>
            <t.icon className={`h-3.5 w-3.5 ${tab === t.key ? "text-white" : t.color}`} /> {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════ TAB: GERAL ═══════════ */}
      {tab === "general" && (
        <div className={cardCls}>
          <SectionHeaderStable icon={Settings} color="text-purple-500" title="Configuracoes Gerais" desc="Identidade, marca e regras basicas da plataforma" isDark={s.isDark} textPrimary={s.textPrimary} textMuted={s.textMuted} />

          {/* Logo + Favicon uploads */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Logo */}
            <div className={`rounded-xl p-4 border ${s.borderLight} space-y-3`}>
              <div className="flex items-center gap-2">
                <Image className="h-4 w-4 text-purple-500" />
                <span className={`text-xs font-semibold ${s.textPrimary}`}>Logo do Site</span>
              </div>
              <div className="flex items-center gap-4">
                <div className={`h-20 w-20 rounded-xl border-2 border-dashed ${s.isDark ? "border-white/10 bg-white/[0.03]" : "border-gray-200 bg-gray-50"} flex items-center justify-center overflow-hidden`}>
                  {siteLogo ? <img src={siteLogo} alt="Logo" className="h-full w-full object-contain" /> : <Image className={`h-8 w-8 ${s.textMuted}`} />}
                </div>
                <div className="flex-1 space-y-2">
                  <button onClick={() => logoRef.current?.click()} disabled={uploading === "site_logo"}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${s.btnSecondary} disabled:opacity-50`}>
                    {uploading === "site_logo" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Carregar Logo
                  </button>
                  <p className={`text-[10px] ${s.textMuted}`}>PNG, JPG ate 2MB. Recomendado: 200x60px</p>
                  <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, "site_logo"); e.target.value = ""; }} />
                </div>
              </div>
            </div>

            {/* Favicon */}
            <div className={`rounded-xl p-4 border ${s.borderLight} space-y-3`}>
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-orange-500" />
                <span className={`text-xs font-semibold ${s.textPrimary}`}>Favicon</span>
              </div>
              <div className="flex items-center gap-4">
                <div className={`h-20 w-20 rounded-xl border-2 border-dashed ${s.isDark ? "border-white/10 bg-white/[0.03]" : "border-gray-200 bg-gray-50"} flex items-center justify-center overflow-hidden`}>
                  {siteFavicon ? <img src={siteFavicon} alt="Favicon" className="h-12 w-12 object-contain" /> : <FileCode className={`h-8 w-8 ${s.textMuted}`} />}
                </div>
                <div className="flex-1 space-y-2">
                  <button onClick={() => faviconRef.current?.click()} disabled={uploading === "site_favicon"}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${s.btnSecondary} disabled:opacity-50`}>
                    {uploading === "site_favicon" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Carregar Favicon
                  </button>
                  <p className={`text-[10px] ${s.textMuted}`}>PNG, ICO ate 512KB. Recomendado: 32x32 ou 64x64px</p>
                  <input ref={faviconRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, "site_favicon"); e.target.value = ""; }} />
                </div>
              </div>
            </div>

            {/* Logo Size Controls */}
            <div className={`rounded-xl p-4 border ${s.borderLight} space-y-4`}>
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-blue-500" />
                <span className={`text-xs font-semibold ${s.textPrimary}`}>Tamanho do Logo</span>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`text-[11px] font-medium ${s.textMuted}`}>Navbar (Cabecalho)</label>
                    <span className={`text-[11px] font-bold ${s.textPrimary}`}>{logoNavbarHeight}px</span>
                  </div>
                  <input type="range" min={20} max={80} step={2} value={logoNavbarHeight} onChange={(e) => setLogoNavbarHeight(Number(e.target.value))}
                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                  <div className="flex justify-between mt-0.5">
                    <span className={`text-[9px] ${s.textMuted}`}>20px</span>
                    <span className={`text-[9px] ${s.textMuted}`}>80px</span>
                  </div>
                  {siteLogo && <div className={`mt-2 p-2 rounded-lg border ${s.borderLight} flex items-center justify-center`}>
                    <img src={siteLogo} alt="Preview navbar" style={{ height: `${logoNavbarHeight}px` }} className="object-contain max-w-[200px]" />
                  </div>}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`text-[11px] font-medium ${s.textMuted}`}>Footer (Rodape)</label>
                    <span className={`text-[11px] font-bold ${s.textPrimary}`}>{logoFooterHeight}px</span>
                  </div>
                  <input type="range" min={16} max={64} step={2} value={logoFooterHeight} onChange={(e) => setLogoFooterHeight(Number(e.target.value))}
                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                  <div className="flex justify-between mt-0.5">
                    <span className={`text-[9px] ${s.textMuted}`}>16px</span>
                    <span className={`text-[9px] ${s.textMuted}`}>64px</span>
                  </div>
                  {siteLogo && <div className={`mt-2 p-2 rounded-lg border ${s.borderLight} flex items-center justify-center`}>
                    <img src={siteLogo} alt="Preview footer" style={{ height: `${logoFooterHeight}px` }} className="object-contain max-w-[180px]" />
                  </div>}
                </div>
              </div>
            </div>
          </div>

          {/* Name + Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputFieldStable label="Nome do Site" value={siteName} onChange={setSiteName} placeholder="SuperLojas" required inputCls={inputCls} labelCls={labelCls} textMuted={s.textMuted} />
            <div className="sm:col-span-2">
              <label className={labelCls}>Descricao do Site</label>
              <textarea value={siteDescription} onChange={(e) => setSiteDescription(e.target.value)} rows={3} placeholder="O maior marketplace de Angola..."
                className={`${inputCls} resize-none`} />
            </div>
          </div>

          {/* Auto-approve toggle */}
          <div className={`rounded-xl p-4 border ${s.borderLight}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg ${s.isDark ? "bg-emerald-500/10" : "bg-emerald-50"} flex items-center justify-center`}>
                  <Store className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${s.textPrimary}`}>Aprovacao Automatica de Lojas</p>
                  <p className={`text-[11px] ${s.textMuted}`}>{storeAutoApprove ? "Aprovacao imediata" : "Aprovacao manual"}</p>
                </div>
              </div>
              <ToggleBtnStable val={storeAutoApprove} onChange={setStoreAutoApprove} label={storeAutoApprove ? "Activo" : "Manual"} textMuted={s.textMuted} />
            </div>
          </div>

          {/* Category Themes toggle */}
          <div className={`rounded-xl p-4 border ${s.borderLight}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg ${s.isDark ? "bg-violet-500/10" : "bg-violet-50"} flex items-center justify-center`}>
                  <Package className="h-4 w-4 text-violet-500" />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${s.textPrimary}`}>Temas por Categoria nas Lojas</p>
                  <p className={`text-[11px] ${s.textMuted}`}>{categoryThemesEnabled ? "Cada loja tem cores baseadas na sua categoria" : "Todas as lojas usam o tema padrao"}</p>
                </div>
              </div>
              <ToggleBtnStable val={categoryThemesEnabled} onChange={setCategoryThemesEnabled} label={categoryThemesEnabled ? "Activo" : "Desligado"} textMuted={s.textMuted} />
            </div>
          </div>

          <SaveBtnStable onClick={saveGeneral} saving={saving} label="Guardar Geral" btnPrimary={s.btnPrimary} />
        </div>
      )}

      {/* ═══════════ TAB: SEO ═══════════ */}
      {tab === "seo" && (
        <div className="space-y-5">
          {/* Meta Tags */}
          <div className={cardCls}>
            <SectionHeaderStable icon={Search} color="text-green-500" title="Meta Tags & SEO" desc="Optimizacao para motores de busca — aparece nos resultados do Google" isDark={s.isDark} textPrimary={s.textPrimary} textMuted={s.textMuted} />

            <div className="space-y-4">
              <div>
                <label className={labelCls}>Titulo SEO (Title Tag)</label>
                <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="SuperLojas — O Maior Marketplace de Angola" className={inputCls} maxLength={70} />
                <div className="flex justify-between mt-1">
                  <p className={`text-[10px] ${s.textMuted}`}>Aparece como titulo nos resultados do Google. Max 60-70 caracteres.</p>
                  <span className={`text-[10px] font-medium ${seoTitle.length > 60 ? "text-amber-500" : s.textMuted}`}>{seoTitle.length}/70</span>
                </div>
              </div>

              <div>
                <label className={labelCls}>Meta Descricao</label>
                <textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={3} placeholder="O maior marketplace de Angola. Compre e venda produtos de lojas locais com entrega rapida." className={`${inputCls} resize-none`} maxLength={160} />
                <div className="flex justify-between mt-1">
                  <p className={`text-[10px] ${s.textMuted}`}>Descricao que aparece nos resultados do Google. Max 150-160 caracteres.</p>
                  <span className={`text-[10px] font-medium ${seoDescription.length > 150 ? "text-amber-500" : s.textMuted}`}>{seoDescription.length}/160</span>
                </div>
              </div>

              <div>
                <label className={labelCls}>Palavras-chave (Keywords)</label>
                <input value={seoKeywords} onChange={(e) => setSeoKeywords(e.target.value)} placeholder="marketplace angola, compras online, lojas angola, produtos luanda" className={inputCls} />
                <p className={`text-[10px] ${s.textMuted} mt-1`}>Separadas por virgula. Ex: marketplace angola, compras online, lojas</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>URL Canonica</label>
                  <input value={seoCanonical} onChange={(e) => setSeoCanonical(e.target.value)} placeholder="https://superlojas.ao" className={inputCls} />
                  <p className={`text-[10px] ${s.textMuted} mt-1`}>URL principal do site (evita conteudo duplicado)</p>
                </div>
                <div>
                  <label className={labelCls}>Directivas Robots</label>
                  <select value={seoRobots} onChange={(e) => setSeoRobots(e.target.value)} className={inputCls}>
                    <option value="index, follow">index, follow (recomendado)</option>
                    <option value="index, nofollow">index, nofollow</option>
                    <option value="noindex, follow">noindex, follow</option>
                    <option value="noindex, nofollow">noindex, nofollow</option>
                  </select>
                  <p className={`text-[10px] ${s.textMuted} mt-1`}>Controla como o Google indexa o site</p>
                </div>
              </div>
            </div>

            {/* Preview Google */}
            <div className={`rounded-xl p-4 border ${s.borderLight}`}>
              <p className={`text-[10px] ${s.textMuted} uppercase tracking-wider mb-2 font-semibold`}>Pre-visualizacao Google</p>
              <div className="space-y-0.5">
                <p className="text-[#1a0dab] text-sm font-medium truncate">{seoTitle || siteName || "SuperLojas"} — Marketplace de Angola</p>
                <p className="text-[#006621] text-xs truncate">{seoCanonical || "https://superlojas.ao"}</p>
                <p className={`text-xs ${s.textMuted} line-clamp-2`}>{seoDescription || siteDescription || "O maior marketplace de Angola. Compre e venda produtos de lojas locais."}</p>
              </div>
            </div>
          </div>

          {/* Open Graph */}
          <div className={cardCls}>
            <SectionHeaderStable icon={ExternalLink} color="text-blue-500" title="Open Graph (Redes Sociais)" desc="Como o site aparece quando partilhado no Facebook, WhatsApp, etc." isDark={s.isDark} textPrimary={s.textPrimary} textMuted={s.textMuted} />

            <div>
              <label className={labelCls}>Imagem OG (Open Graph)</label>
              <input value={seoOgImage} onChange={(e) => setSeoOgImage(e.target.value)} placeholder="https://superlojas.ao/og-image.jpg" className={inputCls} />
              <p className={`text-[10px] ${s.textMuted} mt-1`}>URL da imagem que aparece ao partilhar o site. Recomendado: 1200x630px</p>
            </div>

            {/* OG Preview */}
            <div className={`rounded-xl overflow-hidden border ${s.borderLight}`}>
              <div className={`h-32 ${s.isDark ? "bg-white/[0.03]" : "bg-gray-100"} flex items-center justify-center`}>
                {seoOgImage ? <img src={seoOgImage} alt="OG" className="h-full w-full object-cover" /> : <Image className={`h-10 w-10 ${s.textMuted}`} />}
              </div>
              <div className="p-3 space-y-0.5">
                <p className={`text-[10px] ${s.textMuted} uppercase`}>{seoCanonical ? new URL(seoCanonical).hostname : "superlojas.ao"}</p>
                <p className={`text-xs font-semibold ${s.textPrimary} truncate`}>{seoTitle || siteName || "SuperLojas"}</p>
                <p className={`text-[11px] ${s.textMuted} line-clamp-2`}>{seoDescription || siteDescription || "O maior marketplace de Angola."}</p>
              </div>
            </div>
          </div>

          {/* Analytics */}
          <div className={cardCls}>
            <SectionHeaderStable icon={BarChart3} color="text-orange-500" title="Analytics & Tracking" desc="Codigos de rastreamento para analise de trafego" isDark={s.isDark} textPrimary={s.textPrimary} textMuted={s.textMuted} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputFieldStable label="Google Analytics (GA4)" value={seoGaId} onChange={setSeoGaId} placeholder="G-XXXXXXXXXX" hint="ID de medicao do Google Analytics 4" inputCls={inputCls} labelCls={labelCls} textMuted={s.textMuted} />
              <InputFieldStable label="Google Tag Manager" value={seoGtmId} onChange={setSeoGtmId} placeholder="GTM-XXXXXXX" hint="Container ID do GTM" inputCls={inputCls} labelCls={labelCls} textMuted={s.textMuted} />
              <InputFieldStable label="Facebook Pixel" value={seoFbPixel} onChange={setSeoFbPixel} placeholder="XXXXXXXXXXXXXXX" hint="ID do pixel do Facebook/Meta" inputCls={inputCls} labelCls={labelCls} textMuted={s.textMuted} />
            </div>
          </div>

          {/* Custom head scripts */}
          <div className={cardCls}>
            <SectionHeaderStable icon={Code} color="text-violet-500" title="Scripts Personalizados" desc="Codigo HTML/JS adicionado ao head de todas as paginas" isDark={s.isDark} textPrimary={s.textPrimary} textMuted={s.textMuted} />

            <div>
              <label className={labelCls}>Scripts no Head</label>
              <textarea value={seoHeadScripts} onChange={(e) => setSeoHeadScripts(e.target.value)} rows={5} placeholder="<!-- Exemplo: schema.org, chat widgets, etc. -->" className={`${inputCls} resize-none font-mono text-xs`} />
              <p className={`text-[10px] ${s.textMuted} mt-1`}>Cuidado: codigo invalido pode quebrar o site. Use para schema.org, chat widgets, etc.</p>
            </div>
          </div>

          <SaveBtnStable onClick={saveSeo} saving={saving} label="Guardar SEO" btnPrimary={s.btnPrimary} />
        </div>
      )}

      {/* ═══════════ TAB: MARQUEE / PUBLICIDADE ═══════════ */}
      {tab === "marquee" && (
        <div className={cardCls}>
          <SectionHeaderStable icon={Megaphone} color="text-amber-500" title="Barra de Publicidade (Marquee)" desc="Mensagens que aparecem no topo do site em rolagem" isDark={s.isDark} textPrimary={s.textPrimary} textMuted={s.textMuted} />

          <div className="flex items-center justify-between">
            <ToggleBtnStable val={marqueeActive} onChange={setMarqueeActive} label={marqueeActive ? "Visivel no site" : "Desligado"} textMuted={s.textMuted} />
            <div className="flex items-center gap-2">
              <label className={`text-[10px] ${s.textMuted}`}>Velocidade (s):</label>
              <input type="number" value={marqueeSpeed} onChange={(e) => setMarqueeSpeed(e.target.value)} min="5" max="120"
                className={`${s.input} border rounded-lg px-2 py-1 text-xs w-16 focus:outline-none focus:ring-2 focus:ring-orange-500/20`} />
            </div>
          </div>

          {/* Marquee preview */}
          {marqueeMessages.length > 0 && (
            <div className={`relative overflow-hidden rounded-xl ${s.isDark ? "bg-white text-black" : "bg-gray-900 text-white"} py-2`}>
              <div className="flex animate-marquee whitespace-nowrap">
                {[...marqueeMessages, ...marqueeMessages].map((msg, i) => (
                  <span key={i} className="mx-8 text-xs font-medium">{msg}</span>
                ))}
              </div>
              <div className={`absolute top-0.5 right-2 text-[8px] font-bold uppercase tracking-widest ${s.isDark ? "text-black/30" : "text-white/30"}`}>preview</div>
            </div>
          )}

          {/* Messages list */}
          <div className="space-y-2">
            <label className={labelCls}>Mensagens ({marqueeMessages.length})</label>
            {marqueeMessages.map((msg, i) => (
              <div key={i} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}>
                <GripVertical className={`h-3.5 w-3.5 ${s.textMuted} shrink-0`} />
                <input value={msg} onChange={(e) => {
                  const msgs = [...marqueeMessages];
                  msgs[i] = e.target.value;
                  setMarqueeMessages(msgs);
                }} className={`flex-1 bg-transparent text-xs ${s.textPrimary} focus:outline-none`} />
                <button onClick={() => setMarqueeMessages(marqueeMessages.filter((_, j) => j !== i))}
                  className={`${s.textMuted} hover:text-red-500 transition-colors shrink-0`}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            {/* Add new */}
            <div className="flex gap-2">
              <input value={newMarqueeMsg} onChange={(e) => setNewMarqueeMsg(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && newMarqueeMsg.trim()) { setMarqueeMessages([...marqueeMessages, newMarqueeMsg.trim()]); setNewMarqueeMsg(""); } }}
                placeholder="Nova mensagem... (Enter para adicionar)" className={inputCls} />
              <button onClick={() => { if (newMarqueeMsg.trim()) { setMarqueeMessages([...marqueeMessages, newMarqueeMsg.trim()]); setNewMarqueeMsg(""); } }}
                className={`px-3 py-2.5 rounded-xl ${s.btnPrimary} text-xs font-semibold shrink-0`}><Plus className="h-4 w-4" /></button>
            </div>
          </div>

          <div className={`p-3 rounded-xl text-[10px] ${s.isDark ? "bg-amber-500/5 text-amber-400 border border-amber-500/10" : "bg-amber-50 text-amber-700 border border-amber-100"}`}>
            <Volume2 className="h-3.5 w-3.5 inline mr-1.5" />
            Dica: Use emojis para tornar as mensagens mais atractivas. Ex: "🎉 Bem-vindo ao SuperLojas!"
          </div>

          <SaveBtnStable onClick={saveMarquee} saving={saving} label="Guardar Publicidade" btnPrimary={s.btnPrimary} />
        </div>
      )}

      {/* ═══════════ TAB: CONTACTOS ═══════════ */}
      {tab === "contact" && (
        <div className={cardCls}>
          <SectionHeaderStable icon={Phone} color="text-blue-500" title="Informacoes de Contacto" desc="Dados que aparecem na pagina de contacto e no rodape" isDark={s.isDark} textPrimary={s.textPrimary} textMuted={s.textMuted} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputFieldStable label="Email" value={contactEmail} onChange={setContactEmail} placeholder="info@superlojas.ao" hint="Aparece na pagina de contacto e rodape" inputCls={inputCls} labelCls={labelCls} textMuted={s.textMuted} />
            <InputFieldStable label="Telefone" value={contactPhone} onChange={setContactPhone} placeholder="+244 923 456 789" inputCls={inputCls} labelCls={labelCls} textMuted={s.textMuted} />
            <InputFieldStable label="WhatsApp" value={contactWhatsapp} onChange={setContactWhatsapp} placeholder="+244 923 456 789" hint="Numero com codigo do pais" inputCls={inputCls} labelCls={labelCls} textMuted={s.textMuted} />
            <InputFieldStable label="Cidade" value={contactCity} onChange={setContactCity} placeholder="Luanda, Angola" inputCls={inputCls} labelCls={labelCls} textMuted={s.textMuted} />
            <div className="sm:col-span-2">
              <InputFieldStable label="Endereco Completo" value={contactAddress} onChange={setContactAddress} placeholder="Talatona, Luanda Sul, Angola" inputCls={inputCls} labelCls={labelCls} textMuted={s.textMuted} />
            </div>
          </div>

          {/* Business hours */}
          <div>
            <label className={labelCls}>Horario de Atendimento</label>
            <div className="space-y-2">
              {contactHours.map((h, i) => (
                <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}>
                  <Clock className={`h-3.5 w-3.5 ${s.textMuted} shrink-0`} />
                  <input value={h.label} onChange={(e) => {
                    const hrs = [...contactHours]; hrs[i] = { ...hrs[i], label: e.target.value }; setContactHours(hrs);
                  }} placeholder="Segunda - Sexta" className={`bg-transparent text-xs font-medium ${s.textPrimary} focus:outline-none w-40`} />
                  <input value={h.hours} onChange={(e) => {
                    const hrs = [...contactHours]; hrs[i] = { ...hrs[i], hours: e.target.value }; setContactHours(hrs);
                  }} placeholder="08:00 - 18:00" className={`bg-transparent text-xs ${s.textPrimary} focus:outline-none flex-1`} />
                  <button onClick={() => setContactHours(contactHours.filter((_, j) => j !== i))}
                    className={`${s.textMuted} hover:text-red-500 transition-colors`}><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
              <button onClick={() => setContactHours([...contactHours, { label: "", hours: "" }])}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs ${s.btnSecondary}`}>
                <Plus className="h-3.5 w-3.5" /> Adicionar horario
              </button>
            </div>
          </div>

          <SaveBtnStable onClick={saveContact} saving={saving} label="Guardar Contactos" btnPrimary={s.btnPrimary} />
        </div>
      )}

      {/* ═══════════ TAB: REDES SOCIAIS ═══════════ */}
      {tab === "social" && (
        <div className={cardCls}>
          <SectionHeaderStable icon={Globe} color="text-pink-500" title="Redes Sociais" desc="Links que aparecem no rodape e pagina de contacto" isDark={s.isDark} textPrimary={s.textPrimary} textMuted={s.textMuted} />

          <div className="space-y-4">
            {[
              { label: "Instagram", val: socialInstagram, set: setSocialInstagram, icon: Instagram, p: "https://instagram.com/superlojas", color: "text-pink-500" },
              { label: "Facebook", val: socialFacebook, set: setSocialFacebook, icon: Facebook, p: "https://facebook.com/superlojas", color: "text-blue-600" },
              { label: "TikTok", val: socialTiktok, set: setSocialTiktok, icon: Globe, p: "https://tiktok.com/@superlojas", color: "text-gray-800" },
              { label: "YouTube", val: socialYoutube, set: setSocialYoutube, icon: Globe, p: "https://youtube.com/@superlojas", color: "text-red-500" },
              { label: "Twitter / X", val: socialTwitter, set: setSocialTwitter, icon: Globe, p: "https://x.com/superlojas", color: "text-sky-500" },
              { label: "LinkedIn", val: socialLinkedin, set: setSocialLinkedin, icon: Globe, p: "https://linkedin.com/company/superlojas", color: "text-blue-700" },
              { label: "Website", val: socialWebsite, set: setSocialWebsite, icon: Globe, p: "https://superlojas.ao", color: "text-emerald-500" },
            ].map((net) => (
              <div key={net.label} className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"} flex items-center justify-center shrink-0`}>
                  <net.icon className={`h-5 w-5 ${net.color}`} />
                </div>
                <div className="flex-1">
                  <label className={labelCls}>{net.label}</label>
                  <input value={net.val} onChange={(e) => net.set(e.target.value)} placeholder={net.p} className={inputCls} />
                </div>
              </div>
            ))}
          </div>

          <SaveBtnStable onClick={saveSocial} saving={saving} label="Guardar Redes Sociais" btnPrimary={s.btnPrimary} />
        </div>
      )}

      {/* ═══════════ TAB: RESTRICOES ═══════════ */}
      {tab === "restrictions" && (
        <div className={cardCls}>
          <SectionHeaderStable icon={Shield} color="text-red-500" title="Restricoes e Limites" desc="Controle de funcionalidades e limites da plataforma" isDark={s.isDark} textPrimary={s.textPrimary} textMuted={s.textMuted} />

          {/* Maintenance mode */}
          <div className={`rounded-xl p-4 border-2 ${maintenanceMode ? "border-red-500/30 bg-red-50/50" : s.borderLight} transition-colors`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg ${maintenanceMode ? "bg-red-100" : s.isDark ? "bg-red-500/10" : "bg-red-50"} flex items-center justify-center`}>
                  <AlertTriangle className={`h-4 w-4 ${maintenanceMode ? "text-red-600" : "text-red-500"}`} />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${s.textPrimary}`}>Modo Manutencao</p>
                  <p className={`text-[11px] ${s.textMuted}`}>{maintenanceMode ? "Site inacessivel para clientes" : "Site a funcionar normalmente"}</p>
                </div>
              </div>
              <ToggleBtnStable val={maintenanceMode} onChange={setMaintenanceMode} label={maintenanceMode ? "ACTIVO" : "Desligado"} textMuted={s.textMuted} />
            </div>
            {maintenanceMode && (
              <div className="mt-3 p-2.5 rounded-lg bg-red-100 text-red-700 text-[11px] font-medium">
                ⚠️ O site esta em modo de manutencao. Os visitantes vao ver uma pagina de manutencao.
              </div>
            )}
          </div>

          {/* Registration toggles */}
          <div className={`rounded-xl p-4 border ${s.borderLight} space-y-4`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg ${s.isDark ? "bg-blue-500/10" : "bg-blue-50"} flex items-center justify-center`}>
                  <ShoppingBag className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${s.textPrimary}`}>Registo de Utilizadores</p>
                  <p className={`text-[11px] ${s.textMuted}`}>Permitir novos registos de clientes</p>
                </div>
              </div>
              <ToggleBtnStable val={registrationEnabled} onChange={setRegistrationEnabled} label={registrationEnabled ? "Activo" : "Bloqueado"} textMuted={s.textMuted} />
            </div>
            <div className={`border-t ${s.borderLight} pt-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-lg ${s.isDark ? "bg-orange-500/10" : "bg-orange-50"} flex items-center justify-center`}>
                    <Store className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${s.textPrimary}`}>Registo de Lojas</p>
                    <p className={`text-[11px] ${s.textMuted}`}>Permitir abrir novas lojas</p>
                  </div>
                </div>
                <ToggleBtnStable val={storeRegistrationEnabled} onChange={setStoreRegistrationEnabled} label={storeRegistrationEnabled ? "Activo" : "Bloqueado"} textMuted={s.textMuted} />
              </div>
            </div>
          </div>

          {/* Limits */}
          <div className={`rounded-xl p-4 border ${s.borderLight} space-y-4`}>
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-violet-500" />
              <span className={`text-xs font-semibold ${s.textPrimary}`}>Limites</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <InputFieldStable label="Max Produtos/Loja" value={maxProductsPerStore} onChange={setMaxProductsPerStore} type="number" placeholder="Ilimitado" hint="Vazio = ilimitado" inputCls={inputCls} labelCls={labelCls} textMuted={s.textMuted} />
              <InputFieldStable label="Max Imagens/Produto" value={maxImagesPerProduct} onChange={setMaxImagesPerProduct} type="number" placeholder="5" inputCls={inputCls} labelCls={labelCls} textMuted={s.textMuted} />
              <InputFieldStable label="Max Ficheiro (MB)" value={maxFileSize} onChange={setMaxFileSize} type="number" placeholder="4" inputCls={inputCls} labelCls={labelCls} textMuted={s.textMuted} />
              <InputFieldStable label="Cooldown Categorias (dias)" value={categoryCooldownDays} onChange={setCategoryCooldownDays} type="number" placeholder="30" hint="Dias entre trocas de categoria" inputCls={inputCls} labelCls={labelCls} textMuted={s.textMuted} />
            </div>
          </div>

          <SaveBtnStable onClick={saveRestrictions} saving={saving} label="Guardar Restricoes" btnPrimary={s.btnPrimary} />
        </div>
      )}

      {/* ═══════════ TAB: SMTP ═══════════ */}
      {tab === "smtp" && (
        <div className={cardCls}>
          <SectionHeaderStable icon={Mail} color="text-cyan-500" title="Configuracao SMTP" desc="Servidor de envio de emails" isDark={s.isDark} textPrimary={s.textPrimary} textMuted={s.textMuted} />

          {/* Servidor principal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputFieldStable label="Servidor SMTP" value={smtp.host} onChange={(v) => setSmtp({ ...smtp, host: v })} placeholder="mail.superloja.vip" required inputCls={inputCls} labelCls={labelCls} textMuted={s.textMuted} />
            <InputFieldStable label="Porta" value={smtp.port} onChange={(v) => setSmtp({ ...smtp, port: v })} placeholder="465" required hint="465 (SSL) | 587 (TLS) | 25 (sem encriptacao)" inputCls={inputCls} labelCls={labelCls} textMuted={s.textMuted} />
            <InputFieldStable label="Utilizador" value={smtp.username} onChange={(v) => setSmtp({ ...smtp, username: v })} placeholder="user@gmail.com" required inputCls={inputCls} labelCls={labelCls} textMuted={s.textMuted} />
            <div>
              <label className={labelCls}>Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <input type={showSmtpPass ? "text" : "password"} value={smtp.password} onChange={(e) => setSmtp({ ...smtp, password: e.target.value })} placeholder="••••••••"
                  className={`${inputCls} pr-10`} />
                <button type="button" onClick={() => setShowSmtpPass(!showSmtpPass)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${s.textMuted}`}>
                  {showSmtpPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className={labelCls}>Encriptacao</label>
              <select value={smtp.encryption} onChange={(e) => setSmtp({ ...smtp, encryption: e.target.value })} className={inputCls}>
                <option value="ssl">SSL (porta 465)</option>
                <option value="tls">STARTTLS (porta 587)</option>
                <option value="none">Nenhuma (porta 25)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Modo Autenticacao</label>
              <select value={smtp.auth_mode} onChange={(e) => setSmtp({ ...smtp, auth_mode: e.target.value })} className={inputCls}>
                <option value="auto">Automatico</option>
                <option value="login">LOGIN</option>
                <option value="plain">PLAIN</option>
                <option value="cram-md5">CRAM-MD5</option>
              </select>
            </div>
          </div>

          {/* Remetente */}
          <div className={`rounded-xl p-4 border ${s.borderLight} space-y-4`}>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-cyan-500" />
              <span className={`text-xs font-semibold ${s.textPrimary}`}>Remetente</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputFieldStable label="Email Remetente" value={smtp.from_address} onChange={(v) => setSmtp({ ...smtp, from_address: v })} placeholder="noreply@superlojas.ao" required inputCls={inputCls} labelCls={labelCls} textMuted={s.textMuted} />
              <InputFieldStable label="Nome Remetente" value={smtp.from_name} onChange={(v) => setSmtp({ ...smtp, from_name: v })} placeholder="SuperLojas" inputCls={inputCls} labelCls={labelCls} textMuted={s.textMuted} />
            </div>
          </div>

          {/* Avancado */}
          <div className={`rounded-xl p-4 border ${s.borderLight} space-y-4`}>
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-violet-500" />
              <span className={`text-xs font-semibold ${s.textPrimary}`}>Opcoes Avancadas</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <InputFieldStable label="Timeout (segundos)" value={smtp.timeout} onChange={(v) => setSmtp({ ...smtp, timeout: v })} type="number" placeholder="30" inputCls={inputCls} labelCls={labelCls} textMuted={s.textMuted} />
              <div>
                <label className={labelCls}>Verificar Certificado SSL</label>
                <select value={smtp.verify_peer} onChange={(e) => setSmtp({ ...smtp, verify_peer: e.target.value })} className={inputCls}>
                  <option value="true">Sim (recomendado)</option>
                  <option value="false">Nao (servidores sem certificado valido)</option>
                </select>
              </div>
            </div>
            <p className={`text-[10px] ${s.textMuted}`}>
              Desactive "Verificar Certificado" apenas se o seu servidor usar um certificado auto-assinado. Timeout define o tempo maximo de espera pela resposta do servidor.
            </p>
          </div>

          {/* Test connection + email */}
          <div className={`pt-4 border-t ${s.borderLight} space-y-4`}>
            <div className="flex items-center gap-3">
              <button onClick={testConn} disabled={testingConn}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold ${s.isDark ? "bg-violet-500/20 text-violet-400 hover:bg-violet-500/30" : "bg-violet-50 text-violet-600 hover:bg-violet-100"} transition-colors disabled:opacity-50`}>
                {testingConn ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />} Testar Conexao
              </button>
              <span className={`text-[10px] ${s.textMuted}`}>Verifica se a ligacao e autenticacao SMTP funcionam (sem enviar email).</span>
            </div>
            <div>
              <label className={labelCls}>Enviar Email de Teste</label>
              <div className="flex gap-2">
                <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="email@teste.com"
                  className={`flex-1 ${inputCls}`} />
                <button onClick={testSmtp} disabled={testing}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold ${s.isDark ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30" : "bg-cyan-50 text-cyan-600 hover:bg-cyan-100"} transition-colors disabled:opacity-50`}>
                  {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enviar Teste
                </button>
              </div>
            </div>
          </div>

          <SaveBtnStable onClick={saveSmtp} saving={saving} label="Guardar SMTP" btnPrimary={s.btnPrimary} />
        </div>
      )}

      {/* ═══════════ TAB: SMS ═══════════ */}
      {tab === "sms" && (
        <div className={cardCls}>
          <SectionHeaderStable icon={MessageSquare} color="text-emerald-500" title="Configuracao SMS" desc="Provedor de SMS para notificacoes" isDark={s.isDark} textPrimary={s.textPrimary} textMuted={s.textMuted} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Provedor</label>
              <select value={sms.provider} onChange={(e) => setSms({ ...sms, provider: e.target.value })} className={inputCls}>
                <option value="twilio">Twilio</option><option value="nexmo">Vonage (Nexmo)</option>
                <option value="africas_talking">Africa's Talking</option><option value="custom">Custom API</option>
              </select>
            </div>
            <InputFieldStable label="Sender ID" value={sms.sender_id} onChange={(v) => setSms({ ...sms, sender_id: v })} placeholder="SuperLojas" inputCls={inputCls} labelCls={labelCls} textMuted={s.textMuted} />
            <div>
              <label className={labelCls}>API Key <span className="text-red-500">*</span></label>
              <div className="relative">
                <input type={showSmsKey ? "text" : "password"} value={sms.api_key} onChange={(e) => setSms({ ...sms, api_key: e.target.value })} placeholder="sk_live_..."
                  className={`${inputCls} pr-10`} />
                <button type="button" onClick={() => setShowSmsKey(!showSmsKey)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${s.textMuted}`}>
                  {showSmsKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <InputFieldStable label="API Secret" value={sms.api_secret} onChange={(v) => setSms({ ...sms, api_secret: v })} placeholder="Secret..." type="password" inputCls={inputCls} labelCls={labelCls} textMuted={s.textMuted} />
            {sms.provider === "custom" && (
              <div className="sm:col-span-2">
                <InputFieldStable label="Base URL (API personalizada)" value={sms.base_url} onChange={(v) => setSms({ ...sms, base_url: v })} placeholder="https://api.smsprovider.com/v1" inputCls={inputCls} labelCls={labelCls} textMuted={s.textMuted} />
              </div>
            )}
          </div>

          <SaveBtnStable onClick={saveSms} saving={saving} label="Guardar SMS" btnPrimary={s.btnPrimary} />
        </div>
      )}

      {/* ═══════════ TAB: PWA ═══════════ */}
      {tab === "pwa" && (
        <div className={cardCls}>
          <SectionHeaderStable icon={Smartphone} color="text-indigo-500" title="Progressive Web App (PWA)" desc="Permita que os utilizadores instalem o site como aplicacao no telemovel" isDark={s.isDark} textPrimary={s.textPrimary} textMuted={s.textMuted} />

          {/* Enable toggle */}
          <div className={`rounded-xl p-4 border ${s.borderLight}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg ${s.isDark ? "bg-indigo-500/10" : "bg-indigo-50"} flex items-center justify-center`}>
                  <Smartphone className="h-4 w-4 text-indigo-500" />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${s.textPrimary}`}>Activar PWA</p>
                  <p className={`text-[11px] ${s.textMuted}`}>{pwaEnabled ? "Os utilizadores podem instalar a app" : "PWA desactivado"}</p>
                </div>
              </div>
              <ToggleBtnStable val={pwaEnabled} onChange={setPwaEnabled} label={pwaEnabled ? "Activo" : "Desactivo"} textMuted={s.textMuted} />
            </div>
          </div>

          {/* Icons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Icon 192x192 */}
            <div className={`rounded-xl p-4 border ${s.borderLight} space-y-3`}>
              <div className="flex items-center gap-2">
                <Image className="h-4 w-4 text-indigo-500" />
                <span className={`text-xs font-semibold ${s.textPrimary}`}>Icone 192x192</span>
              </div>
              <div className="flex items-center gap-4">
                <div className={`h-20 w-20 rounded-xl border-2 border-dashed ${s.isDark ? "border-white/10 bg-white/[0.03]" : "border-gray-200 bg-gray-50"} flex items-center justify-center overflow-hidden`}>
                  {pwaIcon192 ? <img src={pwaIcon192} alt="PWA 192" className="h-full w-full object-contain" /> : <Smartphone className={`h-8 w-8 ${s.textMuted}`} />}
                </div>
                <div className="flex-1 space-y-2">
                  <button onClick={() => pwaIcon192Ref.current?.click()} disabled={uploading === "pwa_icon_192"}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${s.btnSecondary} disabled:opacity-50`}>
                    {uploading === "pwa_icon_192" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Carregar
                  </button>
                  <p className={`text-[10px] ${s.textMuted}`}>PNG 192x192px. Usado no ecra inicial.</p>
                  <input ref={pwaIcon192Ref} type="file" accept="image/png" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPwaIcon(f, "pwa_icon_192"); e.target.value = ""; }} />
                </div>
              </div>
            </div>

            {/* Icon 512x512 */}
            <div className={`rounded-xl p-4 border ${s.borderLight} space-y-3`}>
              <div className="flex items-center gap-2">
                <Image className="h-4 w-4 text-purple-500" />
                <span className={`text-xs font-semibold ${s.textPrimary}`}>Icone 512x512</span>
              </div>
              <div className="flex items-center gap-4">
                <div className={`h-20 w-20 rounded-xl border-2 border-dashed ${s.isDark ? "border-white/10 bg-white/[0.03]" : "border-gray-200 bg-gray-50"} flex items-center justify-center overflow-hidden`}>
                  {pwaIcon512 ? <img src={pwaIcon512} alt="PWA 512" className="h-full w-full object-contain" /> : <Smartphone className={`h-8 w-8 ${s.textMuted}`} />}
                </div>
                <div className="flex-1 space-y-2">
                  <button onClick={() => pwaIcon512Ref.current?.click()} disabled={uploading === "pwa_icon_512"}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${s.btnSecondary} disabled:opacity-50`}>
                    {uploading === "pwa_icon_512" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Carregar
                  </button>
                  <p className={`text-[10px] ${s.textMuted}`}>PNG 512x512px. Splash screen e loja de apps.</p>
                  <input ref={pwaIcon512Ref} type="file" accept="image/png" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPwaIcon(f, "pwa_icon_512"); e.target.value = ""; }} />
                </div>
              </div>
            </div>
          </div>

          {/* App info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputFieldStable label="Nome da App" value={pwaName} onChange={setPwaName} placeholder="SuperLojas — Marketplace" inputCls={inputCls} labelCls={labelCls} textMuted={s.textMuted} hint="Nome completo exibido na instalacao" />
            <InputFieldStable label="Nome Curto" value={pwaShortName} onChange={setPwaShortName} placeholder="SuperLojas" inputCls={inputCls} labelCls={labelCls} textMuted={s.textMuted} hint="Exibido no ecra inicial (max 12 caracteres)" />
            <div className="sm:col-span-2">
              <label className={labelCls}>Descricao</label>
              <textarea value={pwaDescription} onChange={(e) => setPwaDescription(e.target.value)} rows={2} placeholder="O maior marketplace de Angola..." className={`${inputCls} resize-none`} />
            </div>
          </div>

          {/* Colors + Display */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Cor do Tema</label>
              <div className="flex items-center gap-3">
                <input type="color" value={pwaThemeColor} onChange={(e) => setPwaThemeColor(e.target.value)} className="h-10 w-10 rounded-lg border-0 cursor-pointer" />
                <input type="text" value={pwaThemeColor} onChange={(e) => setPwaThemeColor(e.target.value)} className={`flex-1 ${inputCls}`} />
              </div>
              <p className={`text-[10px] ${s.textMuted} mt-1`}>Barra de status e browser</p>
            </div>
            <div>
              <label className={labelCls}>Cor de Fundo</label>
              <div className="flex items-center gap-3">
                <input type="color" value={pwaBgColor} onChange={(e) => setPwaBgColor(e.target.value)} className="h-10 w-10 rounded-lg border-0 cursor-pointer" />
                <input type="text" value={pwaBgColor} onChange={(e) => setPwaBgColor(e.target.value)} className={`flex-1 ${inputCls}`} />
              </div>
              <p className={`text-[10px] ${s.textMuted} mt-1`}>Splash screen ao abrir</p>
            </div>
            <div>
              <label className={labelCls}>Modo de Exibicao</label>
              <select value={pwaDisplay} onChange={(e) => setPwaDisplay(e.target.value)} className={inputCls}>
                <option value="standalone">Standalone (sem barra do browser)</option>
                <option value="fullscreen">Fullscreen (ecra cheio)</option>
                <option value="minimal-ui">Minimal UI (barra minima)</option>
                <option value="browser">Browser (normal)</option>
              </select>
              <p className={`text-[10px] ${s.textMuted} mt-1`}>Como a app aparece ao abrir</p>
            </div>
          </div>

          <InputFieldStable label="URL Inicial" value={pwaStartUrl} onChange={setPwaStartUrl} placeholder="/" inputCls={inputCls} labelCls={labelCls} textMuted={s.textMuted} hint="Pagina que abre ao iniciar a app (ex: / ou /lojas)" />

          {/* Preview */}
          <div className={`rounded-xl p-4 border ${s.borderLight}`}>
            <p className={`text-[10px] font-semibold ${s.textMuted} uppercase tracking-wider mb-3`}>Pre-visualizacao</p>
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-20 w-20 rounded-2xl shadow-lg flex items-center justify-center overflow-hidden" style={{ backgroundColor: pwaBgColor }}>
                  {pwaIcon192 ? <img src={pwaIcon192} alt="Icon" className="h-16 w-16 object-contain" /> : <Smartphone className="h-10 w-10" style={{ color: pwaThemeColor }} />}
                </div>
              </div>
              <div>
                <p className={`text-sm font-bold ${s.textPrimary}`}>{pwaShortName || pwaName || "SuperLojas"}</p>
                <p className={`text-[11px] ${s.textMuted}`}>{pwaDescription || "Marketplace de Angola"}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium" style={{ backgroundColor: pwaThemeColor + "20", color: pwaThemeColor }}>
                    <Monitor className="h-2.5 w-2.5" /> {pwaDisplay}
                  </span>
                  <span className={`text-[10px] ${s.textMuted}`}>{pwaStartUrl}</span>
                </div>
              </div>
            </div>
          </div>

          <SaveBtnStable onClick={savePwa} saving={saving} label="Guardar PWA" btnPrimary={s.btnPrimary} />
        </div>
      )}
    </div>
  );
}
