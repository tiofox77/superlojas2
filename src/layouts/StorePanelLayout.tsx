import { Link, NavLink, Outlet, Navigate, useLocation, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AdminThemeProvider, useAdminTheme } from "@/contexts/AdminThemeContext";
import NotificationDropdown from "@/components/NotificationDropdown";
import { useState, useEffect } from "react";
import { logoSrc, onImgError } from "@/lib/imageHelpers";
import {
  LayoutDashboard, Package, Image, Settings, CreditCard,
  LogOut, Menu, X, Bell, Search, Store, Tag,
  ChevronLeft, Globe, Sun, Moon, ArrowLeft,
  Clock, ShieldX, ShieldCheck, RefreshCw, Key, Crown, Monitor, ShoppingBag, BarChart3
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

const sidebarNav = [
  { label: "Dashboard", path: "", icon: LayoutDashboard, end: true, color: "text-blue-500" },
  { label: "Produtos", path: "/produtos", icon: Package, color: "text-emerald-500" },
  { label: "Categorias", path: "/categorias", icon: Tag, color: "text-pink-500" },
  { label: "Pedidos", path: "/pedidos", icon: ShoppingBag, color: "text-amber-500" },
  { label: "Hero Slides", path: "/slides", icon: Image, color: "text-cyan-500" },
  { label: "Pagamentos", path: "/pagamentos", icon: CreditCard, color: "text-orange-500" },
  { label: "Subscricao", path: "/subscricao", icon: Crown, color: "text-purple-500" },
  { label: "Analytics", path: "/analytics", icon: BarChart3, color: "text-purple-500" },
  { label: "POS", path: "/pos", icon: Monitor, color: "text-teal-500" },
  { label: "API", path: "/api", icon: Key, color: "text-indigo-500" },
  { label: "Configuracoes", path: "/configuracoes", icon: Settings, color: "text-gray-500" },
];

interface PlanInfo {
  id: number; name: string;
  max_products: number; max_images_per_product: number; max_hero_slides: number; max_categories: number;
  custom_domain: boolean; has_api: boolean; has_pos: boolean; analytics: boolean;
  featured_badge: boolean; priority_support: boolean;
}
interface StoreInfo { id: number; name: string; slug: string; logo: string; status: string; categories?: (string | number)[]; plan?: PlanInfo | null; }

function StorePanelInner() {
  const { slug } = useParams<{ slug: string }>();
  const { user, isAuthenticated, isLoading, logout, token } = useAuth();
  const { isDark, toggleTheme } = useAdminTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token || !slug) return;
    fetch(`${API}/store-panel/${slug}/settings`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setStoreInfo(data); });
  }, [token, slug]);

  if (isLoading) return null;
  if (!isAuthenticated || !user) return <Navigate to="/entrar" replace />;
  if (user.role !== "super_admin" && user.role !== "store_owner") return <Navigate to="/" replace />;

  const base = `/loja/${slug}/painel`;

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
  const inputBg = isDark ? "bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30" : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400";

  const NavItem = ({ item, onClick }: { item: typeof sidebarNav[0]; onClick?: () => void }) => (
    <NavLink
      to={base + item.path}
      end={item.end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 ${sidebarOpen || mobileSidebar ? "px-3" : "px-0 justify-center"} py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
          isActive
            ? isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600 shadow-sm shadow-emerald-100"
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
        {/* Store logo */}
        <div className={`flex items-center ${sidebarOpen ? "px-5" : "px-3 justify-center"} h-16 border-b ${borderColor}`}>
          <Link to={base} className="flex items-center gap-2.5">
            <img src={logoSrc(storeInfo?.logo, storeInfo?.name || slug)} alt="" className="h-9 w-9 rounded-xl object-cover shrink-0" onError={onImgError("logo", storeInfo?.name || slug)} />
            {sidebarOpen && (
              <div className="flex flex-col leading-none min-w-0">
                <span className={`text-[10px] font-medium ${textMuted} uppercase tracking-widest`}>Loja</span>
                <span className={`text-sm font-bold ${textPrimary} truncate`}>{storeInfo?.name || slug}</span>
              </div>
            )}
          </Link>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          <div className={`${sidebarOpen ? "px-3" : "px-2"} space-y-1`}>
            {sidebarNav.map((item) => <NavItem key={item.path} item={item} />)}
          </div>
        </nav>

        {/* Back to admin / theme toggle */}
        <div className={`px-3 py-2 border-t ${borderColor} space-y-1`}>
          {user.role === "super_admin" && sidebarOpen && (
            <Link to="/admin/lojas" className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs ${textMuted} hover:text-blue-500 ${hoverBg} transition-colors`}>
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao Admin
            </Link>
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

        {/* User */}
        <div className={`${sidebarOpen ? "px-4" : "px-2"} py-3 border-t ${borderColor}`}>
          <div className={`flex items-center ${sidebarOpen ? "gap-3" : "justify-center"}`}>
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user.name.charAt(0)}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold ${textPrimary} truncate`}>{user.name}</p>
                <p className={`text-[10px] ${textMuted} truncate`}>{user.role === "super_admin" ? "Super Admin" : "Dono da Loja"}</p>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <button onClick={() => logout()} className={`flex items-center gap-2 w-full mt-2 px-3 py-2 rounded-lg text-xs ${textMuted} hover:text-red-500 hover:bg-red-50 transition-colors`}>
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
                <img src={logoSrc(storeInfo?.logo, storeInfo?.name || slug)} alt="" className="h-9 w-9 rounded-xl object-cover" onError={onImgError("logo", storeInfo?.name || slug)} />
                <span className={`text-sm font-bold ${textPrimary} truncate`}>{storeInfo?.name || slug}</span>
              </div>
              <button onClick={() => setMobileSidebar(false)} className={textMuted}><X className="h-5 w-5" /></button>
            </div>
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
              {sidebarNav.map((item) => <NavItem key={item.path} item={item} onClick={() => setMobileSidebar(false)} />)}
            </nav>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className={`h-14 ${topbarBg} border-b flex items-center justify-between px-4 lg:px-6 shrink-0`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileSidebar(true)} className={`lg:hidden ${textSecondary}`}><Menu className="h-5 w-5" /></button>
            <div>
              <h1 className={`text-sm font-bold ${textPrimary}`}>{currentPage?.label || "Painel"}</h1>
              <p className={`text-[11px] ${textMuted}`}>{storeInfo?.name || slug} — Painel da Loja</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <NotificationDropdown apiBase={`/store-panel/${slug}`} isDark={isDark} onNavigate={(link) => navigate(`${base}${link}`)} />
            <Link to={`/lojas/${slug}`} className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium ${textSecondary} ${hoverBg} transition-colors`}>
              <Globe className="h-3.5 w-3.5" /> Ver Loja
            </Link>
            <button onClick={toggleTheme} className={`p-2 rounded-xl ${textSecondary} ${hoverBg} transition-colors lg:hidden`}>
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        <main className={`flex-1 overflow-y-auto ${bg} p-4 lg:p-6`}>
          {/* Loja pendente ou rejeitada — painel restrito */}
          {storeInfo && storeInfo.status !== "approved" && user?.role !== "super_admin" ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center max-w-md">
                {storeInfo.status === "pending" ? (
                  <>
                    <div className={`h-20 w-20 rounded-full ${isDark ? "bg-amber-500/10" : "bg-amber-50"} flex items-center justify-center mx-auto mb-5`}>
                      <Clock className="h-10 w-10 text-amber-500" />
                    </div>
                    <h2 className={`text-xl font-bold ${textPrimary} mb-2`}>Loja em Analise</h2>
                    <p className={`text-sm ${textSecondary} mb-4 leading-relaxed`}>
                      A sua loja <strong>{storeInfo.name}</strong> esta a ser analisada pela nossa equipa. 
                      Este processo demora normalmente ate 48 horas. 
                      Sera notificado assim que for aprovada.
                    </p>
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold ${isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-700"}`}>
                      <Clock className="h-3.5 w-3.5" /> Estado: Pendente de aprovacao
                    </div>
                  </>
                ) : storeInfo.status === "banned" ? (
                  <>
                    <div className={`h-20 w-20 rounded-full ${isDark ? "bg-red-500/10" : "bg-red-50"} flex items-center justify-center mx-auto mb-5`}>
                      <ShieldX className="h-10 w-10 text-red-500" />
                    </div>
                    <h2 className={`text-xl font-bold ${textPrimary} mb-2`}>Loja Suspensa</h2>
                    <p className={`text-sm ${textSecondary} mb-4 leading-relaxed`}>
                      A sua loja <strong>{storeInfo.name}</strong> foi suspensa da plataforma. 
                      Verifique o seu email para mais detalhes sobre o motivo da suspensao. 
                      Entre em contacto com o suporte se achar que foi um erro.
                    </p>
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold ${isDark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-700"}`}>
                      <ShieldX className="h-3.5 w-3.5" /> Estado: Suspensa / Banida
                    </div>
                  </>
                ) : (
                  <>
                    <div className={`h-20 w-20 rounded-full ${isDark ? "bg-red-500/10" : "bg-red-50"} flex items-center justify-center mx-auto mb-5`}>
                      <ShieldX className="h-10 w-10 text-red-500" />
                    </div>
                    <h2 className={`text-xl font-bold ${textPrimary} mb-2`}>Loja Rejeitada</h2>
                    <p className={`text-sm ${textSecondary} mb-4 leading-relaxed`}>
                      Infelizmente a sua loja <strong>{storeInfo.name}</strong> nao foi aprovada. 
                      Isto pode acontecer por informacoes incompletas ou incorrectas. 
                      Entre em contacto connosco para mais detalhes.
                    </p>
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold ${isDark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-700"}`}>
                      <ShieldX className="h-3.5 w-3.5" /> Estado: Rejeitada
                    </div>
                  </>
                )}
                <div className="mt-6 flex gap-3 justify-center flex-wrap">
                  <button onClick={() => { setStoreInfo(null); setTimeout(() => { fetch(`${API}/store-panel/${slug}/settings`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }).then(r => r.ok ? r.json() : null).then(d => { if (d) setStoreInfo(d); }); }, 100); }}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold ${isDark ? "bg-white/5 text-white/70 hover:bg-white/10" : "bg-gray-100 text-gray-700 hover:bg-gray-200"} transition-colors`}>
                    <RefreshCw className="h-3.5 w-3.5" /> Verificar novamente
                  </button>
                  <Link to="/contacto" className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold ${isDark ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"} transition-colors`}>
                    Contactar Suporte
                  </Link>
                  <Link to="/" className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold ${textMuted} hover:${textSecondary} transition-colors`}>
                    <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao site
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <Outlet context={{ slug, storeInfo }} />
          )}
        </main>
      </div>
    </div>
  );
}

export default function StorePanelLayout() {
  return (
    <AdminThemeProvider>
      <StorePanelInner />
    </AdminThemeProvider>
  );
}
