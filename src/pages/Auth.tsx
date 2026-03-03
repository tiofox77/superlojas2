import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Store, Mail, Lock, User, Eye, EyeOff, ArrowRight, Phone, Loader2, CheckCircle2, AlertCircle, Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

const Auth = () => {
  const navigate = useNavigate();
  const { login, register, isAuthenticated, user } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "" });

  // If already logged in, show welcome
  if (isAuthenticated && user) {
    return (
      <main className="min-h-screen bg-secondary/30 flex items-center justify-center py-10 px-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 15 }}
            className="h-20 w-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircle2 className="h-10 w-10 text-success" />
          </motion.div>
          <h2 className="text-xl font-bold mb-1">Bem-vindo, {user.name}!</h2>
          <p className="text-sm text-muted-foreground mb-6">Sessão iniciada como {user.email}</p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate("/")} className="bg-hero-gradient text-primary-foreground rounded-xl gap-2">
              Ir às Compras <ArrowRight className="h-4 w-4" />
            </Button>
            {user.role === "super_admin" && (
              <p className="text-xs text-primary font-medium flex items-center justify-center gap-1 mt-2">
                <ShieldCheck className="h-3.5 w-3.5" /> Super Administrador
              </p>
            )}
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
          setTimeout(() => navigate(dest), 1200);
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
          setTimeout(() => navigate("/"), 1200);
        } else {
          setError(result.error || "Erro ao criar conta.");
        }
      }
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
              <Store className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-extrabold">Super<span className="text-gradient">Lojas</span></span>
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
                    <label className="text-xs font-medium mb-1.5 block">Telemovel</label>
                    <div className="relative">
                      <Phone className={inputIconClass("phone")} />
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        onFocus={() => setFocusedField("phone")}
                        onBlur={() => setFocusedField(null)}
                        placeholder="+244 9XX XXX XXX"
                        className={inputClass("phone")}
                      />
                    </div>
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
                    placeholder="Minimo 6 caracteres"
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
                  <a href="#" className="text-xs text-primary hover:underline font-medium hover:text-primary/80 transition-colors">Esqueceu a palavra-passe?</a>
                </div>
              )}

              {mode === "register" && (
                <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer group">
                  <input type="checkbox" className="rounded border-border mt-0.5 accent-primary" required />
                  <span className="group-hover:text-foreground transition-colors">Aceito os <a href="#" className="text-primary hover:underline">Termos de Uso</a> e <a href="#" className="text-primary hover:underline">Politica de Privacidade</a></span>
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

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">ou continue com</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Social login */}
            <div className="flex gap-3">
              <motion.button
                whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                whileTap={{ scale: 0.97 }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border bg-card hover:bg-secondary transition-colors text-sm font-medium"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </motion.button>
              <motion.button
                whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                whileTap={{ scale: 0.97 }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border bg-card hover:bg-secondary transition-colors text-sm font-medium"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                Apple
              </motion.button>
            </div>
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
            <>Nao tem conta? <button onClick={() => switchMode("register")} className="text-primary font-semibold hover:underline">Registar-se</button></>
          ) : (
            <>Ja tem conta? <button onClick={() => switchMode("login")} className="text-primary font-semibold hover:underline">Entrar</button></>
          )}
        </motion.p>
      </motion.div>
    </main>
  );
};

export default Auth;
