import { useState } from "react";
import { isValidEmail } from "@/lib/validators";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

interface PasswordResetProps {
  onBack: () => void;
}

/**
 * Password recovery flow.
 * - Without `?reset=<token>` in the URL: asks for the email and requests a reset link
 *   (POST /auth/forgot-password).
 * - With `?reset=<token>&email=<email>` (link from the email): asks for the new password
 *   and submits it (POST /auth/reset-password).
 */
export default function PasswordReset({ onBack }: PasswordResetProps) {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("reset");
  const [email, setEmail] = useState(params.get("email") || "");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-10">
      <form
        className="w-full max-w-md space-y-4 rounded-xl border p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          if (loading || !isValidEmail(email)) return;
          if (token && (password.length < 6 || password !== confirmation)) {
            setMessage("As palavras-passe devem coincidir e ter pelo menos 6 caracteres.");
            return;
          }
          setLoading(true);
          setMessage("");
          try {
            const res = await fetch(`${API}/auth/${token ? "reset-password" : "forgot-password"}`, {
              method: "POST",
              signal: AbortSignal.timeout(30000),
              headers: { "Content-Type": "application/json", Accept: "application/json" },
              body: JSON.stringify({
                email: email.trim(),
                ...(token ? { token, password, password_confirmation: confirmation } : {}),
              }),
            });
            const data = await res.json();
            setMessage(data.message || "Não foi possível concluir. Tente novamente.");
            setDone(res.ok);
          } catch {
            setMessage("Falha de ligação. Tente novamente.");
          } finally {
            setLoading(false);
          }
        }}
      >
        <h1 className="text-xl font-bold">{token ? "Redefinir palavra-passe" : "Recuperar palavra-passe"}</h1>
        <label className="block">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full border rounded-lg p-3"
          />
        </label>
        {token && (
          <>
            <label className="block">
              Nova palavra-passe
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full border rounded-lg p-3"
              />
            </label>
            <label className="block">
              Confirmar palavra-passe
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                className="block w-full border rounded-lg p-3"
              />
            </label>
          </>
        )}
        {message && (
          <p role="status" className="text-sm">
            {message}
          </p>
        )}
        <button
          disabled={loading || done}
          className="w-full bg-primary text-primary-foreground p-3 rounded-lg disabled:opacity-50"
        >
          {loading ? "A processar..." : token ? "Guardar palavra-passe" : "Enviar link de recuperação"}
        </button>
        <button type="button" onClick={onBack} className="text-primary underline">
          Voltar a entrar
        </button>
      </form>
    </main>
  );
}
