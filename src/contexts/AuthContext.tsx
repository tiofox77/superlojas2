import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import fetchApi from "@/services/api";

interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: "super_admin" | "store_owner" | "customer";
  phone: string | null;
  avatar: string | null;
  store_id: number | null;
  store?: { id: number; name: string; slug: string; logo: string; status: string } | null;
  is_active: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: AuthUser }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<AuthUser>) => Promise<void>;
  setAuth: (token: string, user: AuthUser) => void;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  phone?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("auth_token"));
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    if (token) {
      fetchMe(token).finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchMe = async (t: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${t}`, Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        localStorage.removeItem("auth_token");
        setToken(null);
        setUser(null);
      }
    } catch {
      localStorage.removeItem("auth_token");
      setToken(null);
      setUser(null);
    }
  };

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        const msg = data.errors?.email?.[0] || data.message || "Erro ao fazer login.";
        return { success: false, error: msg };
      }

      localStorage.setItem("auth_token", data.token);
      setToken(data.token);
      setUser(data.user);
      return { success: true, user: data.user };
    } catch {
      return { success: false, error: "Erro de conexão. Tente novamente." };
    }
  }, []);

  const register = useCallback(async (regData: RegisterData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(regData),
      });
      const data = await res.json();

      if (!res.ok) {
        const firstError = Object.values(data.errors || {})[0];
        const msg = Array.isArray(firstError) ? firstError[0] : data.message || "Erro ao criar conta.";
        return { success: false, error: msg as string };
      }

      localStorage.setItem("auth_token", data.token);
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch {
      return { success: false, error: "Erro de conexão. Tente novamente." };
    }
  }, []);

  const logout = useCallback(async () => {
    if (token) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
      } catch {}
    }
    localStorage.removeItem("auth_token");
    setToken(null);
    setUser(null);
  }, [token]);

  const updateProfile = useCallback(async (data: Partial<AuthUser>) => {
    if (!token) return;
    const res = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated = await res.json();
      setUser(updated);
    }
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
        setAuth: (t: string, u: AuthUser) => { localStorage.setItem('auth_token', t); setToken(t); setUser(u); },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
