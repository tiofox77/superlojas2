import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

function getVisitorId(): string {
  let id = localStorage.getItem("sv_id");
  if (!id) {
    id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem("sv_id", id);
  }
  return id;
}

/**
 * Tracks page views by sending a POST to /api/track on every navigation.
 * Skips admin and store-panel routes to avoid inflating analytics.
 */
export function PageTracker() {
  const location = useLocation();
  const { token } = useAuth();
  const lastPath = useRef("");

  useEffect(() => {
    const path = location.pathname;

    // Skip admin/panel routes
    if (path.startsWith("/admin") || path.includes("/painel")) return;

    // Skip duplicate rapid navigations to same path
    if (path === lastPath.current) return;
    lastPath.current = path;

    // Small delay to avoid tracking fast redirects
    const timer = setTimeout(() => {
      try {
        const payload: Record<string, string> = {
          path,
          visitor_id: getVisitorId(),
        };
        if (document.referrer) payload.referrer = document.referrer;

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: "application/json",
        };
        if (token) headers.Authorization = `Bearer ${token}`;

        fetch(`${API}/track`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        }).catch(() => {});
      } catch {}
    }, 300);

    return () => clearTimeout(timer);
  }, [location.pathname, token]);

  return null;
}
