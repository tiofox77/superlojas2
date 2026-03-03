import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Store, CheckCircle2, Upload, Loader2, ChevronRight, ChevronLeft, MapPin, User, Phone, FileText, Image as ImageIcon, Rocket, Eye, EyeOff, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

interface ProvinceData { name: string; municipalities: string[]; }

const CATEGORIES = ["Electronica", "Moda", "Casa & Jardim", "Desporto", "Beleza", "Alimentacao", "Automoveis", "Servicos", "Saude", "Educacao", "Outros"];

const RegisterStore = () => {
  const { token, user, isAuthenticated, setAuth } = useAuth();
  const navigate = useNavigate();

  // Provinces data from API
  const [provinces, setProvinces] = useState<ProvinceData[]>([]);

  // Step state
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Step 1 — Dados da loja
  const [storeName, setStoreName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState("");
  const logoRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  // Step 2 — Localizacao & Contacto
  const [province, setProvince] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  // Step 3 — Dados do utilizador
  const [userName, setUserName] = useState(user?.name || "");
  const [userPhone, setUserPhone] = useState(user?.phone || "");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Submission
  const [submitted, setSubmitted] = useState(false);
  const [autoApproved, setAutoApproved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Fetch provinces
  useEffect(() => {
    fetch(`${API}/provinces`).then(r => r.json()).then(d => setProvinces(d)).catch(() => {});
  }, []);

  // Get municipalities for selected province
  const currentMunicipalities = provinces.find(p => p.name === province)?.municipalities || [];

  // Reset municipality when province changes
  useEffect(() => { setMunicipality(""); setCity(""); }, [province]);

  // When municipality is selected, set city to municipality name as default
  useEffect(() => { if (municipality) setCity(municipality); }, [municipality]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setLogoFile(file); setLogoPreview(URL.createObjectURL(file)); }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setBannerFile(file); setBannerPreview(URL.createObjectURL(file)); }
  };

  const canGoNext = () => {
    if (step === 1) return !!storeName && !!description && !!category && !!logoFile;
    if (step === 2) return !!province && !!municipality && !!whatsapp;
    if (step === 3) {
      if (!userName) return false;
      if (!isAuthenticated) return !!userEmail && !!userPassword && userPassword.length >= 6;
      return true;
    }
    return false;
  };

  const handleSubmit = async () => {
    setSaving(true); setError("");
    const fd = new FormData();
    fd.append("name", storeName);
    fd.append("description", description);
    fd.append("category", category);
    fd.append("province", province);
    fd.append("city", city || municipality);
    fd.append("municipality", municipality);
    fd.append("address", address);
    fd.append("whatsapp", whatsapp);
    fd.append("user_name", userName);
    fd.append("user_phone", userPhone);
    fd.append("logo", logoFile!);
    if (bannerFile) fd.append("banner", bannerFile);

    // Se nao esta logado, enviar campos de criacao de conta
    if (!isAuthenticated) {
      fd.append("user_email", userEmail);
      fd.append("user_password", userPassword);
    }

    const endpoint = isAuthenticated ? `${API}/stores/register` : `${API}/stores/register-guest`;
    const headers: Record<string, string> = { Accept: "application/json" };
    if (isAuthenticated && token) headers.Authorization = `Bearer ${token}`;

    try {
      const res = await fetch(endpoint, { method: "POST", headers, body: fd });
      const data = await res.json();
      if (res.ok) {
        // Auto-login se criou conta nova
        if (data.token && data.user) {
          setAuth(data.token, data.user);
        }
        setSubmitted(true);
        setAutoApproved(data.auto_approved || false);
      } else {
        setError(data.errors ? (Object.values(data.errors).flat().join(", ") as string) : data.message || "Erro ao registar loja.");
      }
    } catch { setError("Erro de conexao. Tente novamente."); }
    finally { setSaving(false); }
  };

  // Success screen
  if (submitted) {
    return (
      <main className="min-h-screen bg-secondary/30 flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Loja Registada!</h1>
          <p className="text-muted-foreground mb-6 text-sm">
            {autoApproved
              ? "A sua loja foi aprovada automaticamente! Ja pode comecar a adicionar produtos."
              : "A sua loja sera analisada e aprovada em ate 48 horas. Recebera uma notificacao."}
          </p>
          <div className="flex gap-3 justify-center">
            <Link to="/"><Button variant="outline">Voltar ao Inicio</Button></Link>
            {autoApproved && <Button onClick={() => navigate("/")}>Ir para Minha Loja</Button>}
          </div>
        </div>
      </main>
    );
  }

  const inputClass = "w-full rounded-xl border border-border bg-secondary/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all";
  const labelClass = "text-sm font-medium mb-1.5 block";

  const steps = [
    { num: 1, label: "Dados da Loja", icon: Store },
    { num: 2, label: "Localizacao", icon: MapPin },
    { num: 3, label: "Seus Dados", icon: User },
  ];

  return (
    <main className="min-h-screen bg-secondary/30">
      {/* Hero */}
      <div className="bg-hero-gradient py-8 sm:py-12">
        <div className="container text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-10 w-10 rounded-xl bg-card/20 backdrop-blur flex items-center justify-center">
              <Store className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-primary-foreground">Abrir Minha Loja</h1>
          </div>
          <p className="text-primary-foreground/80 text-sm max-w-md mx-auto">
            Cadastre sua loja gratuitamente em 3 passos simples.
          </p>
        </div>
      </div>

      <div className="container py-6 max-w-2xl">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center gap-2">
              <button
                onClick={() => { if (s.num < step) setStep(s.num); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  step === s.num
                    ? "bg-primary text-primary-foreground shadow-md"
                    : step > s.num
                    ? "bg-green-100 text-green-700"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {step > s.num ? <CheckCircle2 className="h-3.5 w-3.5" /> : <s.icon className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{s.num}</span>
              </button>
              {i < steps.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          {error && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">{error}</div>}

          {/* ──── STEP 1: Dados da Loja ──── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold mb-1">Dados da Loja</h3>
                <p className="text-xs text-muted-foreground">Informacoes basicas sobre a sua loja</p>
              </div>

              {/* Logo + Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Logo da Loja *</label>
                  <div onClick={() => logoRef.current?.click()}
                    className="h-28 w-28 rounded-xl border-2 border-dashed border-border hover:border-primary flex items-center justify-center cursor-pointer transition-colors overflow-hidden">
                    {logoPreview ? <img src={logoPreview} alt="" className="h-full w-full object-cover" />
                      : <div className="text-center"><Upload className="h-6 w-6 text-muted-foreground mx-auto mb-1" /><span className="text-[10px] text-muted-foreground">Logo</span></div>}
                  </div>
                  <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                  <p className="text-[10px] text-muted-foreground mt-1">JPG, PNG ate 2MB</p>
                </div>
                <div>
                  <label className={labelClass}>Banner (opcional)</label>
                  <div onClick={() => bannerRef.current?.click()}
                    className="h-28 w-full rounded-xl border-2 border-dashed border-border hover:border-primary flex items-center justify-center cursor-pointer transition-colors overflow-hidden">
                    {bannerPreview ? <img src={bannerPreview} alt="" className="h-full w-full object-cover" />
                      : <div className="text-center"><ImageIcon className="h-6 w-6 text-muted-foreground mx-auto mb-1" /><span className="text-[10px] text-muted-foreground">Banner</span></div>}
                  </div>
                  <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
                  <p className="text-[10px] text-muted-foreground mt-1">Imagem de capa, JPG/PNG ate 4MB</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Nome da Loja *</label>
                  <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Ex: TechZone Angola" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Categoria Principal *</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                    <option value="">Seleccionar...</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Descricao da Loja *</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Descreva a sua loja, o que vende, etc."
                  className={`${inputClass} resize-none`} />
              </div>
            </div>
          )}

          {/* ──── STEP 2: Localizacao & Contacto ──── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold mb-1">Localizacao e Contacto</h3>
                <p className="text-xs text-muted-foreground">Onde fica a sua loja e como contactar</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Provincia *</label>
                  <select value={province} onChange={(e) => setProvince(e.target.value)} className={inputClass}>
                    <option value="">Seleccionar provincia...</option>
                    {provinces.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Municipio *</label>
                  <select value={municipality} onChange={(e) => setMunicipality(e.target.value)} className={inputClass} disabled={!province}>
                    <option value="">{province ? "Seleccionar municipio..." : "Seleccione provincia primeiro"}</option>
                    {currentMunicipalities.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Cidade / Bairro</label>
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex: Talatona" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>WhatsApp *</label>
                  <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+244 9XX XXX XXX" className={inputClass} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Endereco / Rua</label>
                  <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ex: Rua do Comercio, n.25, Kilamba" className={inputClass} />
                </div>
              </div>
            </div>
          )}

          {/* ──── STEP 3: Dados do Utilizador ──── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold mb-1">{isAuthenticated ? "Seus Dados" : "Criar Conta e Dados"}</h3>
                <p className="text-xs text-muted-foreground">
                  {isAuthenticated ? "Confirme ou actualize os seus dados pessoais" : "Crie a sua conta para gerir a loja"}
                </p>
              </div>

              {/* Se esta logado, aviso */}
              {isAuthenticated && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" /> Sessao iniciada como <strong>{user?.email}</strong>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Nome Completo *</label>
                  <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Seu nome completo" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Telefone</label>
                  <input type="tel" value={userPhone} onChange={(e) => setUserPhone(e.target.value)} placeholder="+244 9XX XXX XXX" className={inputClass} />
                </div>

                {/* Campos de criacao de conta — so para visitantes */}
                {!isAuthenticated ? (
                  <>
                    <div>
                      <label className={labelClass}>Email *</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="seu@email.com" className={`${inputClass} pl-10`} />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Senha * <span className="font-normal text-muted-foreground">(min. 6 caracteres)</span></label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input type={showPassword ? "text" : "password"} value={userPassword} onChange={(e) => setUserPassword(e.target.value)} placeholder="Criar senha" className={`${inputClass} pl-10 pr-10`} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-[10px] text-muted-foreground">
                        Ao criar conta, concorda com os nossos <Link to="/termos" className="underline">Termos de Uso</Link> e <Link to="/privacidade" className="underline">Politica de Privacidade</Link>.
                      </p>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className={labelClass}>Email</label>
                    <input type="email" value={user?.email || ""} disabled className={`${inputClass} opacity-60 cursor-not-allowed`} />
                    <p className="text-[10px] text-muted-foreground mt-1">O email nao pode ser alterado aqui</p>
                  </div>
                )}
              </div>

              {/* Resumo */}
              <div className="rounded-xl bg-secondary/80 border border-border p-4 space-y-2 mt-2">
                <p className="text-xs font-bold mb-2">Resumo do Registo</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <span className="text-muted-foreground">Loja:</span><span className="font-medium">{storeName}</span>
                  <span className="text-muted-foreground">Categoria:</span><span className="font-medium">{category}</span>
                  <span className="text-muted-foreground">Provincia:</span><span className="font-medium">{province}</span>
                  <span className="text-muted-foreground">Municipio:</span><span className="font-medium">{municipality}</span>
                  {city && city !== municipality && <><span className="text-muted-foreground">Cidade:</span><span className="font-medium">{city}</span></>}
                  {address && <><span className="text-muted-foreground">Endereco:</span><span className="font-medium">{address}</span></>}
                  <span className="text-muted-foreground">WhatsApp:</span><span className="font-medium">{whatsapp}</span>
                  <span className="text-muted-foreground">Proprietario:</span><span className="font-medium">{userName}</span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
            <div>
              {step > 1 && (
                <Button variant="outline" onClick={() => { setStep(step - 1); setError(""); }} className="gap-2 rounded-xl text-xs">
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </Button>
              )}
            </div>
            <div>
              {step < totalSteps ? (
                <Button onClick={() => { setStep(step + 1); setError(""); }} disabled={!canGoNext()} className="gap-2 rounded-xl text-xs bg-hero-gradient text-primary-foreground hover:opacity-90">
                  Proximo <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={saving || !canGoNext()} className="gap-2 rounded-xl text-xs bg-hero-gradient text-primary-foreground hover:opacity-90">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                  {saving ? "A enviar..." : "Enviar Solicitacao"}
                </Button>
              )}
            </div>
          </div>

          {/* Benefits */}
          <div className="mt-6 pt-4 border-t border-border grid grid-cols-3 gap-3 text-center">
            {[
              { icon: "🆓", title: "100% Gratis", desc: "Sem taxas" },
              { icon: "⚡", title: "Rapido", desc: "Aprovacao rapida" },
              { icon: "📱", title: "Facil", desc: "Gerencie pelo celular" },
            ].map((b) => (
              <div key={b.title}>
                <span className="text-2xl">{b.icon}</span>
                <p className="text-xs font-semibold mt-1">{b.title}</p>
                <p className="text-[10px] text-muted-foreground">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
};

export default RegisterStore;
