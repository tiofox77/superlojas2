import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Store, Mail, Lock, User, Eye, EyeOff, ArrowRight, Loader2, CheckCircle2, AlertCircle, Sparkles, ShieldCheck, LayoutDashboard, ShoppingBag, LogOut, Package, ExternalLink } from "lucide-react";
import PhoneInput from "@/components/PhoneInput";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { isSubdomainMode, getMainSiteUrl } from "@/hooks/useSubdomain";
import { isAngolanPhone } from "@/lib/validators";
import PasswordReset from "@/components/auth/PasswordReset";

const Auth = () => {
  // `?reset=<token>` (link from the recovery email) opens the password reset form directly
  const [showReset, setShowReset] = useState(new URLSearchParams(window.location.search).has("reset"));
  const navigate = useNavigate();
  const { login, register, isAuthenticated, user, logout } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "" });

  if (showReset) {
    return (
      <PasswordReset
        onBack={() => {
          window.history.replaceState(null, "", "/entrar");
          setShowReset(false);
        }}
      />
    );
  }

  // If already logged in, show welcome with role-aware quick links
  if (isAuthenticated && user) {
    const onSubdomain = isSubdomainMode();
    const mainSite = onSubdomain ? getMainSiteUrl() : "";
    // Navigate: absolute redirect when on subdomain (panels live on main domain)
    const goPanel = (path: string) => {
      if (onSubdomain) window.location.href = `${mainSite}${path}`;
      else navigate(path);
    };

    const stores = (user.stores && user.stores.length > 0)
      ? user.stores
      : user.store ? [user.store] : [];

    const roleBadge = user.role === "super_admin" ? (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
        <ShieldCheck className="h-3 w-3" /> Super Administrador
      </span>
    ) : user.role === "store_owner" ? (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 bg-orange-500/10 px-2 py-0.5 rounded-full">
        <Store className="h-3 w-3" /> Dono de Loja
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
        <User className="h-3 w-3" /> Cliente
      </span>
    );

    return (
      <main className="min-h-screen bg-secondary/30 flex items-center justify-center py-10 px-4">
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 22 }}
          className="w-full max-w-md bg-card rounded-3xl border border-border shadow-xl p-6 sm:p-8"
        >
          {/* Avatar + greeting */}
          <div className="flex flex-col items-center text-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 15 }}
              className="h-16 w-16 rounded-2xl bg-hero-gradient flex items-center justify-center text-white text-2xl font-bold shadow-lg mb-3"
            >
              {user.name.charAt(0).toUpperCase()}
            </motion.div>
            <h2 className="text-xl font-bold mb-0.5">Olá, {user.name.split(" ")[0]}! 👋</h2>
            <p className="text-xs text-muted-foreground mb-2">{user.email}</p>
            {roleBadge}
            {onSubdomain && (
              <p className="text-[10px] text-muted-foreground mt-2 italic">
                Está numa loja parceira. Os painéis abrem no SuperLoja.
              </p>
            )}
          </div>

          {/* Role-specific primary actions */}
          <div className="space-y-2">
            {user.role === "super_admin" && (
              <Button
                onClick={() => goPanel("/admin")}
                className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl gap-2 h-11 font-semibold"
              >
                <ShieldCheck className="h-4 w-4" /> Painel de Administração
                {onSubdomain ? <ExternalLink className="h-3.5 w-3.5 ml-auto" /> : <ArrowRight className="h-4 w-4 ml-auto" />}
              </Button>
            )}

            {user.role === "store_owner" && stores.length > 0 && (
              <>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1">
                  {stores.length > 1 ? "As tuas lojas" : "A tua loja"}
                </p>
                {stores.map((s) => (
                  <button
                    key={s.slug}
                    onClick={() => goPanel(`/loja/${s.slug}/painel`)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-secondary/50 hover:bg-secondary hover:border-primary/30 transition-all text-left group"
                  >
                    <div className="h-9 w-9 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                      <LayoutDashboard className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground">Abrir painel da loja</p>
                    </div>
                    {(s as { status?: string }).status && (s as { status?: string }).status !== "approved" && (
                      <span className="text-[9px] font-bold bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded-full">
                        {(s as { status?: string }).status === "pending" ? "Pendente" : (s as { status?: string }).status}
                      </span>
                    )}
                    {onSubdomain
                      ? <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                      : <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />}
                  </button>
                ))}
                <Button
                  variant="outline"
                  onClick={() => goPanel("/cadastro-loja")}
                  className="w-full rounded-xl gap-2 h-10 text-xs border-dashed"
                >
                  <Store className="h-3.5 w-3.5" /> Abrir Nova Loja
                </Button>
              </>
            )}

            {user.role === "customer" && (
              <>
                <Button
                  onClick={() => goPanel("/minha-conta")}
                  className="w-full bg-hero-gradient text-primary-foreground rounded-xl gap-2 h-11 font-semibold"
                >
                  <LayoutDashboard className="h-4 w-4" /> Minha Conta
                  {onSubdomain ? <ExternalLink className="h-3.5 w-3.5 ml-auto" /> : <ArrowRight className="h-4 w-4 ml-auto" />}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => goPanel("/minha-conta/pedidos")}
                  className="w-full rounded-xl gap-2 h-10 text-xs"
                >
                  <Package className="h-3.5 w-3.5" /> Meus Pedidos
                </Button>
                <Button
                  variant="outline"
                  onClick={() => goPanel("/cadastro-loja")}
                  className="w-full rounded-xl gap-2 h-10 text-xs border-dashed"
                >
                  <Store className="h-3.5 w-3.5" /> Abrir Minha Loja Grátis
                </Button>
              </>
            )}

            {/* Secondary: keep shopping */}
            <div className="pt-2 mt-2 border-t border-border" />
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="w-full rounded-xl gap-2 h-10 text-xs text-muted-foreground hover:text-foreground"
            >
              <ShoppingBag className="h-3.5 w-3.5" /> Continuar a comprar
            </Button>
            <Button
              variant="ghost"
              onClick={async () => { await logout(); }}
              className="w-full rounded-xl gap-2 h-10 text-xs text-destructive hover:bg-destructive/5 hover:text-destructive"
            >
              <LogOut className="h-3.5 w-3.5" /> Terminar Sessão
            </Button>
          </div>
        </motion.div>
      </main>
    );
  }

  const switchMode = (newMode: "login" | "register") => {
    setMode(newMode);
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (mode === "register" && form.phone && !isAngolanPhone(form.phone)) {
      setError("Informe um telefone angolano válido (9 dígitos ou +244).");
      return;
    }

    setIsSubmitting(true);

    if (mode === "register" && form.password !== form.confirmPassword) {
      setError("As palavras-passe não coincidem.");
      setIsSubmitting(false);
      return;
    }

    try {
      if (mode === "login") {
        const result = await login(form.email, form.password);
        if (result.success) {
          setSuccess("Login efectuado com sucesso!");
          // Redirect based on role
          const dest = result.user?.role === "super_admin" ? "/admin" : "/";
          navigate(dest, { replace: true });
        } else {
          setError(result.error || "Erro ao fazer login.");
        }
      } else {
        const result = await register({
          name: form.name,
          email: form.email,
          password: form.password,
          password_confirmation: form.confirmPassword,
          phone: form.phone || undefined,
        });
        if (result.success) {
          setSuccess("Conta criada com sucesso!");
          navigate("/", { replace: true });
        } else {
          setError(result.error || "Erro ao criar conta.");
        }
      }
    } catch {
      setError("Falha de ligação. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full rounded-xl border bg-secondary/50 pl-10 pr-4 py-2.5 text-sm transition-all duration-200 placeholder:text-muted-foreground focus:outline-none focus:ring-2 ${
      focusedField === field
        ? "border-primary ring-2 ring-primary/20 bg-card shadow-sm"
        : "border-border ring-0"
    }`;

  const inputIconClass = (field: string) =>
    `absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200 ${
      focusedField === field ? "text-primary" : "text-muted-foreground"
    }`;

  return (
    <main className="min-h-screen bg-secondary/30 flex items-center justify-center py-10 px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
        >
          <Link to="/" className="flex items-center justify-center gap-2 mb-8 group">
            <div className="h-10 w-10 rounded-xl bg-hero-gradient flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
              <img src="/superloja-favicon-v3.png" alt="" className="h-9 w-9 object-contain" />
            </div>
            <span className="text-xl font-extrabold">Super<span className="text-gradient">Loja</span></span>
          </Link>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="rounded-2xl border border-border bg-card shadow-lg p-6 sm:p-8 relative overflow-hidden"
        >
          {/* Subtle gradient decoration */}
          <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-warning/5 blur-3xl pointer-events-none" />

          <div className="relative z-10">
            {/* Tabs with animation */}
            <div className="flex rounded-xl bg-secondary p-1 mb-6 relative">
              <motion.div
                className="absolute top-1 bottom-1 rounded-lg bg-card shadow-sm"
                animate={{ left: mode === "login" ? "4px" : "calc(50% + 0px)", width: "calc(50% - 6px)" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
              <button
                onClick={() => switchMode("login")}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors relative z-10 ${mode === "login" ? "text-foreground" : "text-muted-foreground hover:text-foreground/70"}`}
              >
                Entrar
              </button>
              <button
                onClick={() => switchMode("register")}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors relative z-10 ${mode === "register" ? "text-foreground" : "text-muted-foreground hover:text-foreground/70"}`}
              >
                Criar Conta
              </button>
            </div>

            {/* Title with animation */}
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: mode === "login" ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: mode === "login" ? 20 : -20 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
                  {mode === "login" ? "Bem-vindo de volta!" : "Crie sua conta"}
                  {mode === "register" && <Sparkles className="h-4 w-4 text-warning" />}
                </h2>
                <p className="text-xs text-muted-foreground mb-6">
                  {mode === "login"
                    ? "Entre na sua conta para continuar a comprar."
                    : "Registe-se para comprar, seguir lojas e muito mais."}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Error/Success messages */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 mb-4"
                >
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                  <p className="text-xs text-destructive font-medium">{error}</p>
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-success/10 border border-success/20 mb-4"
                >
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  <p className="text-xs text-success font-medium">{success}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence>
                {mode === "register" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <label className="text-xs font-medium mb-1.5 block">Nome completo</label>
                    <div className="relative">
                      <User className={inputIconClass("name")} />
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        onFocus={() => setFocusedField("name")}
                        onBlur={() => setFocusedField(null)}
                        placeholder="Seu nome completo"
                        className={inputClass("name")}
                        required
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <label className="text-xs font-medium mb-1.5 block">Email</label>
                <div className="relative">
                  <Mail className={inputIconClass("email")} />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="seu@email.com"
                    className={inputClass("email")}
                    required
                  />
                </div>
              </div>

              <AnimatePresence>
                {mode === "register" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <label className="text-xs font-medium mb-1.5 block">Telemóvel</label>
                    <PhoneInput
                      value={form.phone}
                      onChange={(v) => setForm({ ...form, phone: v })}
                      className={inputClass("phone")}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <label className="text-xs font-medium mb-1.5 block">Palavra-passe</label>
                <div className="relative">
                  <Lock className={inputIconClass("password")} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Mínimo 6 caracteres"
                    className={`${inputClass("password")} !pr-10`}
                    required
                    minLength={6}
                  />
                  <motion.button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    whileTap={{ scale: 0.85 }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </motion.button>
                </div>
                {/* Password strength indicator */}
                {mode === "register" && form.password.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-1 mt-2"
                  >
                    {[1, 2, 3, 4].map((level) => {
                      const strength = form.password.length >= 12 ? 4 : form.password.length >= 8 ? 3 : form.password.length >= 6 ? 2 : 1;
                      const colors = ["bg-destructive", "bg-warning", "bg-warning", "bg-success"];
                      return (
                        <motion.div
                          key={level}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          className={`h-1 flex-1 rounded-full transition-colors duration-300 ${level <= strength ? colors[strength - 1] : "bg-border"}`}
                        />
                      );
                    })}
                  </motion.div>
                )}
              </div>

              <AnimatePresence>
                {mode === "register" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <label className="text-xs font-medium mb-1.5 block">Confirmar palavra-passe</label>
                    <div className="relative">
                      <Lock className={inputIconClass("confirmPassword")} />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={form.confirmPassword}
                        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                        onFocus={() => setFocusedField("confirmPassword")}
                        onBlur={() => setFocusedField(null)}
                        placeholder="Repita a palavra-passe"
                        className={inputClass("confirmPassword")}
                        required
                        minLength={6}
                      />
                      {form.confirmPassword.length > 0 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                        >
                          {form.password === form.confirmPassword ? (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          )}
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {mode === "login" && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer group">
                    <input type="checkbox" className="rounded border-border accent-primary" />
                    <span className="group-hover:text-foreground transition-colors">Lembrar-me</span>
                  </label>
                  <button type="button" onClick={() => setShowReset(true)} className="text-xs text-primary hover:underline">
                    Esqueceu a palavra-passe?
                  </button>
                </div>
              )}

              {mode === "register" && (
                <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer group">
                  <input type="checkbox" className="rounded border-border mt-0.5 accent-primary" required />
                  <span className="group-hover:text-foreground transition-colors">
                    Aceito os <a href="/termos" target="_blank" rel="noopener" className="text-primary hover:underline">Termos de Uso</a> e <a href="/privacidade" target="_blank" rel="noopener" className="text-primary hover:underline">Política de Privacidade</a>
                  </span>
                </label>
              )}

              <motion.div whileTap={{ scale: 0.98 }}>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-hero-gradient text-primary-foreground hover:opacity-90 rounded-xl gap-2 h-11 font-semibold transition-all duration-200 disabled:opacity-70 shadow-md hover:shadow-lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {mode === "login" ? "A entrar..." : "A criar conta..."}
                    </>
                  ) : success ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      {mode === "login" ? "Entrou!" : "Conta criada!"}
                    </>
                  ) : (
                    <>
                      {mode === "login" ? "Entrar" : "Criar Conta"}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </motion.div>
            </form>
          </div>
        </motion.div>

        {/* Bottom */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-xs text-muted-foreground mt-6"
        >
          {mode === "login" ? (
            <>Não tem conta? <button onClick={() => switchMode("register")} className="text-primary font-semibold hover:underline">Registar-se</button></>
          ) : (
            <>Já tem conta? <button onClick={() => switchMode("login")} className="text-primary font-semibold hover:underline">Entrar</button></>
          )}
        </motion.p>
      </motion.div>
    </main>
  );
};

export default Auth;
