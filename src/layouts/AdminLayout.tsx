import { Link, NavLink, Outlet, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AdminThemeProvider, useAdminTheme } from "@/contexts/AdminThemeContext";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import NotificationDropdown from "@/components/NotificationDropdown";
import { useState } from "react";
import {
  LayoutDashboard, Store, Package, Tag, Users, Image, Settings,
  LogOut, ChevronDown, Menu, X, Bell, Search, ShieldCheck,
  ChevronLeft, Globe, Sun, Moon, Send, Megaphone, CreditCard, Crown, Mail,
  BarChart3, FileText, Download
} from "lucide-react";

const sidebarNav = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard, end: true, color: "text-blue-500" },
  { label: "Utilizadores", to: "/admin/utilizadores", icon: Users, color: "text-violet-500" },
  { label: "Lojas", to: "/admin/lojas", icon: Store, color: "text-orange-500" },
  { label: "Produtos", to: "/admin/produtos", icon: Package, color: "text-emerald-500" },
  { label: "Categorias", to: "/admin/categorias", icon: Tag, color: "text-pink-500" },
  { label: "Hero Slides", to: "/admin/slides", icon: Image, color: "text-cyan-500" },
  { label: "Planos", to: "/admin/planos", icon: CreditCard, color: "text-indigo-500" },
  { label: "Subscricoes", to: "/admin/subscricoes", icon: Crown, color: "text-purple-500" },
  { label: "Metodos Pagamento", to: "/admin/metodos-pagamento", icon: CreditCard, color: "text-teal-500" },
  { label: "Notificacoes", to: "/admin/notificacoes", icon: Megaphone, color: "text-amber-500" },
  { label: "Emails", to: "/admin/emails", icon: Mail, color: "text-cyan-500" },
  { label: "Analytics", to: "/admin/analytics", icon: BarChart3, color: "text-rose-500" },
  { label: "Relatorios", to: "/admin/relatorios", icon: FileText, color: "text-sky-500" },
  { label: "Configuracoes", to: "/admin/configuracoes", icon: Settings, color: "text-gray-500" },
  { label: "Actualizacoes", to: "/admin/actualizacoes", icon: Download, color: "text-teal-500" },
];

function AdminLayoutInner() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { isDark, toggleTheme } = useAdminTheme();
  const { data: settings } = useSiteSettings();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  if (isLoading) return null;
  if (!isAuthenticated || !user) return <Navigate to="/entrar" replace />;
  if (user.role !== "super_admin") return <Navigate to="/" replace />;

  const currentPage = sidebarNav.find(
    (n) => n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)
  );

  // Theme classes
  const bg = isDark ? "bg-[#0f1117]" : "bg-gray-50";
  const sidebarBg = isDark ? "bg-[#13151b] border-white/[0.06]" : "bg-white border-gray-200";
  const topbarBg = isDark ? "bg-[#13151b] border-white/[0.06]" : "bg-white border-gray-200 shadow-sm";
  const textPrimary = isDark ? "text-white" : "text-gray-900";
  const textSecondary = isDark ? "text-white/50" : "text-gray-500";
  const textMuted = isDark ? "text-white/30" : "text-gray-400";
  const hoverBg = isDark ? "hover:bg-white/[0.04]" : "hover:bg-gray-50";
  const inputBg = isDark ? "bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30" : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400";
  const borderColor = isDark ? "border-white/[0.06]" : "border-gray-100";

  const NavItem = ({ item, onClick }: { item: typeof sidebarNav[0]; onClick?: () => void }) => (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 ${sidebarOpen || mobileSidebar ? "px-3" : "px-0 justify-center"} py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group ${
          isActive
            ? isDark
              ? "bg-orange-500/10 text-orange-400"
              : "bg-orange-50 text-orange-600 shadow-sm shadow-orange-100"
            : `${isDark ? "text-white/60 hover:text-white hover:bg-white/[0.04]" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"}`
        }`
      }
    >
      <item.icon className={`h-[18px] w-[18px] shrink-0 ${item.color}`} />
      {(sidebarOpen || mobileSidebar) && <span>{item.label}</span>}
    </NavLink>
  );

  return (
    <div className={`flex h-screen ${bg} overflow-hidden`}>
      {/* Sidebar — Desktop */}
      <aside className={`hidden lg:flex flex-col ${sidebarOpen ? "w-64" : "w-[70px]"} ${sidebarBg} border-r transition-all duration-300 shrink-0`}>
        {/* Logo */}
        <div className={`flex items-center ${sidebarOpen ? "px-5" : "px-3 justify-center"} h-16 border-b ${borderColor}`}>
          <Link to="/admin" className="flex items-center gap-2.5">
            {settings?.site_logo ? (
              <img src={settings.site_logo} alt={settings.site_name || "SuperLojas"} className={`${sidebarOpen ? "h-9 max-w-[140px]" : "h-8 w-8 rounded-lg"} object-contain`} />
            ) : (
              <>
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
                  <ShieldCheck className="h-5 w-5 text-white" />
                </div>
                {sidebarOpen && (
                  <div className="flex flex-col leading-none">
                    <span className={`text-[10px] font-medium ${textMuted} uppercase tracking-widest`}>Admin</span>
                    <span className={`text-sm font-bold ${textPrimary}`}>{settings?.site_name || "SuperLojas"}</span>
                  </div>
                )}
              </>
            )}
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <div className={`${sidebarOpen ? "px-3" : "px-2"} space-y-1`}>
            {sidebarNav.map((item) => <NavItem key={item.to} item={item} />)}
          </div>
        </nav>

        {/* Collapse + theme */}
        <div className={`px-3 py-2 border-t ${borderColor} flex ${sidebarOpen ? "justify-between" : "flex-col items-center gap-2"}`}>
          <button onClick={toggleTheme} className={`p-2 rounded-lg ${textMuted} ${hoverBg} transition-colors`} title={isDark ? "Modo claro" : "Modo escuro"}>
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`p-2 rounded-lg ${textMuted} ${hoverBg} transition-colors`}>
            <ChevronLeft className={`h-4 w-4 transition-transform duration-300 ${!sidebarOpen ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* User */}
        <div className={`${sidebarOpen ? "px-4" : "px-2"} py-3 border-t ${borderColor}`}>
          <div className={`flex items-center ${sidebarOpen ? "gap-3" : "justify-center"}`}>
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user.name.charAt(0)}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold ${textPrimary} truncate`}>{user.name}</p>
                <p className={`text-[10px] ${textMuted} truncate`}>{user.email}</p>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <button onClick={() => logout()} className={`flex items-center gap-2 w-full mt-2 px-3 py-2 rounded-lg text-xs ${textMuted} hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors`}>
              <LogOut className="h-3.5 w-3.5" /> Terminar Sessao
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {mobileSidebar && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileSidebar(false)} />
          <aside className={`absolute left-0 top-0 bottom-0 w-72 ${isDark ? "bg-[#13151b]" : "bg-white"} border-r ${borderColor} flex flex-col`}>
            <div className={`flex items-center justify-between px-5 h-16 border-b ${borderColor}`}>
              <Link to="/admin" className="flex items-center gap-2.5" onClick={() => setMobileSidebar(false)}>
                {settings?.site_logo ? (
                  <img src={settings.site_logo} alt={settings.site_name || "SuperLojas"} className="h-9 max-w-[140px] object-contain" />
                ) : (
                  <>
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
                      <ShieldCheck className="h-5 w-5 text-white" />
                    </div>
                    <span className={`text-sm font-bold ${textPrimary}`}>{settings?.site_name || "SuperLojas"}</span>
                  </>
                )}
              </Link>
              <button onClick={() => setMobileSidebar(false)} className={textMuted}><X className="h-5 w-5" /></button>
            </div>
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
              {sidebarNav.map((item) => <NavItem key={item.to} item={item} onClick={() => setMobileSidebar(false)} />)}
            </nav>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className={`h-14 ${topbarBg} border-b flex items-center justify-between px-4 lg:px-6 shrink-0`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileSidebar(true)} className={`lg:hidden ${textSecondary}`}><Menu className="h-5 w-5" /></button>
            <div>
              <h1 className={`text-sm font-bold ${textPrimary}`}>{currentPage?.label || "Admin"}</h1>
              <p className={`text-[11px] ${textMuted}`}>SuperLojas — Painel de Administracao</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`hidden md:flex items-center gap-2 ${inputBg} border rounded-xl px-3 py-1.5`}>
              <Search className={`h-3.5 w-3.5 ${textMuted}`} />
              <input type="text" placeholder="Pesquisar..." className="bg-transparent border-none outline-none text-xs w-36" />
            </div>
            <NotificationDropdown apiBase="/admin" isDark={isDark} onNavigate={(link) => navigate(link)} />
            <button onClick={toggleTheme} className={`p-2 rounded-xl ${textSecondary} ${hoverBg} transition-colors lg:hidden`}>
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link to="/" className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium ${textSecondary} ${hoverBg} transition-colors`}>
              <Globe className="h-3.5 w-3.5" /> Ver Site
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className={`flex-1 overflow-y-auto ${bg} p-4 lg:p-6`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  return (
    <AdminThemeProvider>
      <AdminLayoutInner />
    </AdminThemeProvider>
  );
}
