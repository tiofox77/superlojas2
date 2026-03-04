import { Link, NavLink, Outlet, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AdminThemeProvider, useAdminTheme } from "@/contexts/AdminThemeContext";
import { useState } from "react";
import {
  LayoutDashboard, Package, MapPin, User, Lock, Rss,
  LogOut, Menu, X, Sun, Moon, ChevronLeft, ArrowLeft, Home, Heart, Store
} from "lucide-react";

const sidebarNav = [
  { label: "Dashboard", path: "", icon: LayoutDashboard, end: true, color: "text-blue-500" },
  { label: "Feed", path: "/feed", icon: Rss, color: "text-orange-500" },
  { label: "Lojas Seguidas", path: "/seguindo", icon: Heart, color: "text-pink-500" },
  { label: "Meus Pedidos", path: "/pedidos", icon: Package, color: "text-amber-500" },
  { label: "Enderecos", path: "/enderecos", icon: MapPin, color: "text-emerald-500" },
  { label: "Perfil", path: "/perfil", icon: User, color: "text-purple-500" },
  { label: "Seguranca", path: "/seguranca", icon: Lock, color: "text-red-500" },
];

function ClientPanelInner() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { isDark, toggleTheme } = useAdminTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  if (isLoading) return null;
  if (!isAuthenticated || !user) return <Navigate to="/entrar" replace />;

  const base = "/minha-conta";

  const currentPage = sidebarNav.find(
    (n) => n.end ? location.pathname === base + n.path : location.pathname.startsWith(base + n.path)
  );

  const bg = isDark ? "bg-[#0f1117]" : "bg-gray-50";
  const sidebarBg = isDark ? "bg-[#13151b] border-white/[0.06]" : "bg-white border-gray-200";
  const topbarBg = isDark ? "bg-[#13151b] border-white/[0.06]" : "bg-white border-gray-200 shadow-sm";
  const textPrimary = isDark ? "text-white" : "text-gray-900";
  const textMuted = isDark ? "text-white/30" : "text-gray-400";
  const textSecondary = isDark ? "text-white/50" : "text-gray-500";
  const borderColor = isDark ? "border-white/[0.06]" : "border-gray-100";
  const hoverBg = isDark ? "hover:bg-white/[0.04]" : "hover:bg-gray-50";

  const NavItem = ({ item, onClick }: { item: typeof sidebarNav[0]; onClick?: () => void }) => (
    <NavLink
      to={base + item.path}
      end={item.end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 ${sidebarOpen || mobileSidebar ? "px-3" : "px-0 justify-center"} py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
          isActive
            ? isDark ? "bg-orange-500/10 text-orange-400" : "bg-orange-50 text-orange-600 shadow-sm shadow-orange-100"
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
      {/* Sidebar Desktop */}
      <aside className={`hidden lg:flex flex-col ${sidebarOpen ? "w-64" : "w-[70px]"} ${sidebarBg} border-r transition-all duration-300 shrink-0`}>
        {/* User avatar + name */}
        <div className={`flex items-center ${sidebarOpen ? "px-5" : "px-3 justify-center"} h-16 border-b ${borderColor}`}>
          <Link to={base} className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            {sidebarOpen && (
              <div className="flex flex-col leading-none min-w-0">
                <span className={`text-[10px] font-medium ${textMuted} uppercase tracking-widest`}>Minha Conta</span>
                <span className={`text-sm font-bold ${textPrimary} truncate`}>{user.name.split(" ")[0]}</span>
              </div>
            )}
          </Link>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          <div className={`${sidebarOpen ? "px-3" : "px-2"} space-y-1`}>
            {sidebarNav.map((item) => <NavItem key={item.path} item={item} />)}
          </div>
        </nav>

        {/* Quick links + theme toggle */}
        <div className={`px-3 py-2 border-t ${borderColor} space-y-1`}>
          {sidebarOpen && (
            <>
              <Link to="/" className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs ${textMuted} hover:text-orange-500 ${hoverBg} transition-colors`}>
                <Home className="h-3.5 w-3.5" /> Voltar ao Site
              </Link>
              <Link to="/favoritos" className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs ${textMuted} hover:text-pink-500 ${hoverBg} transition-colors`}>
                <Heart className="h-3.5 w-3.5" /> Favoritos
              </Link>
              {user.role === "store_owner" && user.store?.slug && (
                <Link to={`/loja/${user.store.slug}/painel`} className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs ${textMuted} hover:text-emerald-500 ${hoverBg} transition-colors`}>
                  <Store className="h-3.5 w-3.5" /> Painel da Loja
                </Link>
              )}
            </>
          )}
          <div className={`flex ${sidebarOpen ? "justify-between" : "flex-col items-center gap-2"}`}>
            <button onClick={toggleTheme} className={`p-2 rounded-lg ${textMuted} ${hoverBg} transition-colors`}>
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`p-2 rounded-lg ${textMuted} ${hoverBg} transition-colors`}>
              <ChevronLeft className={`h-4 w-4 transition-transform duration-300 ${!sidebarOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>

        {/* Logout */}
        <div className={`${sidebarOpen ? "px-4" : "px-2"} py-3 border-t ${borderColor}`}>
          {sidebarOpen && (
            <button onClick={() => { logout(); navigate("/"); }} className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs ${textMuted} hover:text-red-500 hover:bg-red-50 transition-colors`}>
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
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className={`text-sm font-bold ${textPrimary} truncate`}>{user.name.split(" ")[0]}</span>
              </div>
              <button onClick={() => setMobileSidebar(false)} className={textMuted}><X className="h-5 w-5" /></button>
            </div>
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
              {sidebarNav.map((item) => <NavItem key={item.path} item={item} onClick={() => setMobileSidebar(false)} />)}
            </nav>
            <div className={`px-4 py-3 border-t ${borderColor} space-y-1`}>
              <Link to="/" onClick={() => setMobileSidebar(false)} className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs ${textMuted} hover:text-orange-500 ${hoverBg} transition-colors`}>
                <Home className="h-3.5 w-3.5" /> Voltar ao Site
              </Link>
              <button onClick={() => { logout(); navigate("/"); }} className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs ${textMuted} hover:text-red-500 hover:bg-red-50 transition-colors`}>
                <LogOut className="h-3.5 w-3.5" /> Terminar Sessao
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className={`h-14 ${topbarBg} border-b flex items-center justify-between px-4 lg:px-6 shrink-0`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileSidebar(true)} className={`lg:hidden ${textSecondary}`}><Menu className="h-5 w-5" /></button>
            <div>
              <h1 className={`text-sm font-bold ${textPrimary}`}>{currentPage?.label || "Minha Conta"}</h1>
              <p className={`text-[11px] ${textMuted}`}>{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Link to="/" className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium ${textSecondary} ${hoverBg} transition-colors`}>
              <Home className="h-3.5 w-3.5" /> Ir as Compras
            </Link>
            <button onClick={toggleTheme} className={`p-2 rounded-xl ${textSecondary} ${hoverBg} transition-colors lg:hidden`}>
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        <main className={`flex-1 overflow-y-auto ${bg} p-4 lg:p-6`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function ClientPanelLayout() {
  return (
    <AdminThemeProvider>
      <ClientPanelInner />
    </AdminThemeProvider>
  );
}
