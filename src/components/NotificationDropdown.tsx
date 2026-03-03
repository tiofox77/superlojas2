import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Bell, Check, CheckCheck, UserPlus, Store, ShoppingBag, Package,
  CheckCircle2, XCircle, Crown, AlertTriangle, Mail, Clock, X
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

interface Notif {
  id: number; type: string; title: string; body: string | null;
  icon: string; color: string; link: string | null;
  is_read: boolean; read_at: string | null; created_at: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  "user-plus": UserPlus, "store": Store, "shopping-bag": ShoppingBag,
  "package": Package, "check-circle": CheckCircle2, "x-circle": XCircle,
  "crown": Crown, "alert-triangle": AlertTriangle, "mail": Mail,
  "clock": Clock, "bell": Bell,
};

const COLOR_MAP: Record<string, string> = {
  violet: "text-violet-500 bg-violet-500/10",
  orange: "text-orange-500 bg-orange-500/10",
  amber: "text-amber-500 bg-amber-500/10",
  blue: "text-blue-500 bg-blue-500/10",
  emerald: "text-emerald-500 bg-emerald-500/10",
  red: "text-red-500 bg-red-500/10",
  cyan: "text-cyan-500 bg-cyan-500/10",
  purple: "text-purple-500 bg-purple-500/10",
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString("pt", { day: "2-digit", month: "2-digit" });
}

interface Props {
  /** Base API path, e.g. "/admin" or "/store-panel/{slug}" */
  apiBase: string;
  isDark: boolean;
  /** Navigate callback when clicking a notification link */
  onNavigate?: (link: string) => void;
  /** Polling interval in ms (default 30000) */
  pollInterval?: number;
}

export default function NotificationDropdown({ apiBase, isDark, onNavigate, pollInterval = 30000 }: Props) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const dropRef = useRef<HTMLDivElement>(null);

  const hdrs: Record<string, string> = { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" };

  const fetchCount = async () => {
    try {
      const res = await fetch(`${API}${apiBase}/notifications/unread-count`, { headers: hdrs });
      if (res.ok) { const d = await res.json(); setUnread(d.count || 0); }
    } catch {}
  };

  const fetchList = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ per_page: "20" });
      if (filter === "unread") params.set("unread_only", "true");
      const res = await fetch(`${API}${apiBase}/notifications?${params}`, { headers: hdrs });
      if (res.ok) { const d = await res.json(); setItems(d.data || []); }
    } catch {}
    finally { setLoading(false); }
  };

  const markRead = async (id: number) => {
    try {
      await fetch(`${API}${apiBase}/notifications/${id}/read`, { method: "PUT", headers: hdrs });
      setItems((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n));
      setUnread((p) => Math.max(0, p - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await fetch(`${API}${apiBase}/notifications/read-all`, { method: "PUT", headers: hdrs });
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
      setUnread(0);
    } catch {}
  };

  // Poll unread count
  useEffect(() => {
    if (!token) return;
    fetchCount();
    const interval = setInterval(fetchCount, pollInterval);
    return () => clearInterval(interval);
  }, [token, apiBase]);

  // Fetch list when dropdown opens
  useEffect(() => { if (open && token) fetchList(); }, [open, filter]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const textPrimary = isDark ? "text-white" : "text-gray-900";
  const textMuted = isDark ? "text-white/40" : "text-gray-400";
  const textSecondary = isDark ? "text-white/60" : "text-gray-500";
  const bgCard = isDark ? "bg-[#1a1c23]" : "bg-white";
  const borderLight = isDark ? "border-white/[0.06]" : "border-gray-100";
  const hoverBg = isDark ? "hover:bg-white/[0.04]" : "hover:bg-gray-50";

  return (
    <div className="relative" ref={dropRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className={`relative p-2 rounded-xl ${isDark ? "text-white/50 hover:bg-white/[0.04]" : "text-gray-500 hover:bg-gray-50"} transition-colors`}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold ring-2 ring-white dark:ring-[#13151b]">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className={`absolute right-0 top-full mt-2 w-[360px] max-h-[480px] rounded-2xl border ${borderLight} ${bgCard} shadow-2xl flex flex-col z-50 overflow-hidden`}>
          {/* Header */}
          <div className={`px-4 py-3 border-b ${borderLight} flex items-center justify-between`}>
            <div>
              <h3 className={`text-sm font-bold ${textPrimary}`}>Notificacoes</h3>
              {unread > 0 && <p className={`text-[10px] ${textMuted}`}>{unread} nao lidas</p>}
            </div>
            <div className="flex items-center gap-1.5">
              {unread > 0 && (
                <button onClick={markAllRead} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium ${textMuted} ${hoverBg} transition-colors`} title="Marcar todas como lidas">
                  <CheckCheck className="h-3 w-3" /> Ler todas
                </button>
              )}
              <button onClick={() => setOpen(false)} className={`p-1 rounded-lg ${textMuted} ${hoverBg}`}><X className="h-3.5 w-3.5" /></button>
            </div>
          </div>

          {/* Filters */}
          <div className={`px-4 py-2 border-b ${borderLight} flex gap-2`}>
            {(["all", "unread"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${filter === f
                  ? "bg-orange-500/10 text-orange-500"
                  : `${textMuted} ${hoverBg}`}`}>
                {f === "all" ? "Todas" : "Nao lidas"}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className={`py-12 text-center ${textMuted} text-xs`}>A carregar...</div>
            ) : items.length === 0 ? (
              <div className={`py-12 text-center`}>
                <Bell className={`h-8 w-8 ${textMuted} mx-auto mb-2 opacity-40`} />
                <p className={`text-xs ${textMuted}`}>Sem notificacoes</p>
              </div>
            ) : (
              items.map((n) => {
                const IconCmp = ICON_MAP[n.icon] || Bell;
                const colorCls = COLOR_MAP[n.color] || COLOR_MAP.blue;
                const [iconColor, iconBg] = colorCls.split(" ");

                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      if (!n.is_read) markRead(n.id);
                      if (n.link && onNavigate) { onNavigate(n.link); setOpen(false); }
                    }}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors border-b ${borderLight} ${
                      n.is_read ? "" : isDark ? "bg-orange-500/[0.03]" : "bg-orange-50/50"
                    } ${hoverBg}`}
                  >
                    <div className={`h-8 w-8 rounded-xl ${iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <IconCmp className={`h-4 w-4 ${iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-xs font-semibold ${textPrimary} truncate flex-1`}>{n.title}</p>
                        {!n.is_read && <span className="h-2 w-2 rounded-full bg-orange-500 shrink-0" />}
                      </div>
                      {n.body && <p className={`text-[11px] ${textSecondary} line-clamp-2 mt-0.5`}>{n.body}</p>}
                      <p className={`text-[10px] ${textMuted} mt-1`}>{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.is_read && (
                      <button onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                        className={`p-1 rounded-lg ${textMuted} hover:text-emerald-500 transition-colors shrink-0`} title="Marcar como lida">
                        <Check className="h-3 w-3" />
                      </button>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
