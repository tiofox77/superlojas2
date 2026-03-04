import { Link } from "react-router-dom";
import { Search, ShoppingCart, User, Menu, X, Store, Heart, ChevronDown, ChevronRight, Zap, BookOpen, Phone, Tag, Users, LogOut, ShieldCheck, Settings, Package, LayoutDashboard } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { Button } from "@/components/ui/button";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { useCategories } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const navLinks = [
  { label: "Início", to: "/", icon: null },
  { label: "Flash Sale", to: "/ofertas", icon: <Zap className="h-3.5 w-3.5 text-destructive" /> },
  { label: "Todas Categorias", to: "/categorias", icon: null },
  { label: "Lojas", to: "/lojas", icon: <Users className="h-3.5 w-3.5" /> },
  { label: "Contacto", to: "/contacto", icon: <Phone className="h-3.5 w-3.5" /> },
];

export function Header() {
  const { totalItems, setIsOpen } = useCart();
  const { totalItems: wishlistCount } = useWishlist();
  const { data: globalCategories = [] } = useCategories();
  const { user, isAuthenticated, logout } = useAuth();
  const { data: settings } = useSiteSettings();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCategories, setShowCategories] = useState(false);
  const [hoveredCat, setHoveredCat] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <AnnouncementBar />
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        {/* Main header row */}
        <div className="container flex h-16 items-center gap-4">
          {/* Hamburger mobile */}
          <button
            className="lg:hidden p-2 text-muted-foreground"
            onClick={() => setMobileMenu(!mobileMenu)}
          >
            {mobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-extrabold text-lg shrink-0">
            {settings?.site_logo ? (
              <img src={settings.site_logo} alt={settings.site_name || "SuperLojas"} className="h-9 max-w-[160px] object-contain" />
            ) : (
              <>
                <div className="h-9 w-9 rounded-xl bg-hero-gradient flex items-center justify-center shadow-md">
                  <Store className="h-4.5 w-4.5 text-primary-foreground" />
                </div>
                <div className="hidden sm:flex flex-col leading-none">
                  <span className="text-xs font-medium text-muted-foreground tracking-wider uppercase">Marketplace</span>
                  <span className="text-base font-extrabold">Super<span className="text-gradient">Lojas</span></span>
                </div>
              </>
            )}
          </Link>

          {/* Search */}
          <div className="flex-1 max-w-2xl hidden md:flex">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Estou à procura de..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-border bg-secondary/50 pl-11 pr-28 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary placeholder:text-muted-foreground"
              />
              <button className="absolute right-1.5 top-1/2 -translate-y-1/2 px-5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
                Buscar
              </button>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1 ml-auto">
            <Link to="/favoritos" className="hidden sm:flex">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground relative">
                <Heart className="h-5 w-5" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </Button>
            </Link>

            {isAuthenticated && user ? (
              <div className="hidden sm:flex relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-xl hover:bg-secondary transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/20">
                    <span className="text-xs font-bold text-primary">{user.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex flex-col text-xs leading-tight text-left">
                    <span className="text-muted-foreground">Olá,</span>
                    <span className="font-semibold truncate max-w-[80px]">{user.name.split(' ')[0]}</span>
                  </div>
                  <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${showUserMenu ? "rotate-180" : ""}`} />
                </button>

                {showUserMenu && (
                  <div className="absolute top-full right-0 mt-2 w-64 bg-card border border-border rounded-2xl shadow-xl z-50 py-2 animate-fade-up">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-border">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">{user.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{user.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                          {user.role === "super_admin" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full mt-1">
                              <ShieldCheck className="h-3 w-3" /> Super Admin
                            </span>
                          )}
                          {user.role === "store_owner" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-orange-600 bg-orange-500/10 px-1.5 py-0.5 rounded-full mt-1">
                              <Store className="h-3 w-3" /> Dono de Loja
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Admin Links */}
                    {user.role === "super_admin" && (
                      <div className="py-1 border-b border-border">
                        <p className="px-4 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Administração</p>
                        <Link to="/admin" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-secondary transition-colors">
                          <LayoutDashboard className="h-4 w-4 text-primary" />
                          <span>Painel Admin</span>
                        </Link>
                        <Link to="/admin/utilizadores" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-secondary transition-colors">
                          <Users className="h-4 w-4 text-blue-500" />
                          <span>Gerir Utilizadores</span>
                        </Link>
                        <Link to="/admin/lojas" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-secondary transition-colors">
                          <Store className="h-4 w-4 text-orange-500" />
                          <span>Gerir Lojas</span>
                        </Link>
                        <Link to="/admin/produtos" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-secondary transition-colors">
                          <Package className="h-4 w-4 text-emerald-500" />
                          <span>Gerir Produtos</span>
                        </Link>
                      </div>
                    )}

                    {/* Store Owner Links */}
                    {user.role === "store_owner" && user.store?.slug && (
                      <div className="py-1 border-b border-border">
                        <p className="px-4 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Minha Loja</p>
                        <Link to={`/loja/${user.store.slug}/painel`} onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-secondary transition-colors">
                          <LayoutDashboard className="h-4 w-4 text-emerald-500" />
                          <span>Painel da Loja</span>
                        </Link>
                        <Link to={`/loja/${user.store.slug}/painel/produtos`} onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-secondary transition-colors">
                          <Package className="h-4 w-4 text-emerald-500" />
                          <span>Meus Produtos</span>
                        </Link>
                        <Link to={`/loja/${user.store.slug}/painel/configuracoes`} onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-secondary transition-colors">
                          <Settings className="h-4 w-4 text-gray-500" />
                          <span>Configuracoes</span>
                        </Link>
                      </div>
                    )}

                    {/* Create Store Link — only for customers without a store */}
                    {user.role === "customer" && (
                      <div className="py-1 border-b border-border">
                        <Link to="/cadastro-loja" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-secondary transition-colors">
                          <Store className="h-4 w-4 text-emerald-500" />
                          <span>Abrir Minha Loja</span>
                          <span className="ml-auto text-[9px] font-bold bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-full">Gratis</span>
                        </Link>
                      </div>
                    )}

                    {/* Common Links */}
                    <div className="py-1 border-b border-border">
                      <Link to="/minha-conta" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-secondary transition-colors">
                        <LayoutDashboard className="h-4 w-4 text-orange-500" />
                        <span>Minha Conta</span>
                      </Link>
                      <Link to="/minha-conta/pedidos" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-secondary transition-colors">
                        <Package className="h-4 w-4 text-amber-500" />
                        <span>Meus Pedidos</span>
                      </Link>
                      <Link to="/favoritos" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-secondary transition-colors">
                        <Heart className="h-4 w-4 text-pink-500" />
                        <span>Favoritos</span>
                        {wishlistCount > 0 && <span className="ml-auto text-[10px] font-bold bg-pink-500/10 text-pink-500 px-1.5 py-0.5 rounded-full">{wishlistCount}</span>}
                      </Link>
                      <Link to="/minha-conta/perfil" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-secondary transition-colors">
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        <span>Definicoes</span>
                      </Link>
                    </div>

                    {/* Logout */}
                    <div className="py-1">
                      <button
                        onClick={() => { logout(); setShowUserMenu(false); }}
                        className="flex items-center gap-3 px-4 py-2 text-sm w-full hover:bg-destructive/5 text-destructive transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Terminar Sessão</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/entrar" className="hidden sm:flex items-center gap-1 px-2 hover:opacity-80 transition-opacity">
                <User className="h-5 w-5 text-muted-foreground" />
                <div className="flex flex-col text-xs leading-tight">
                  <span className="text-muted-foreground">Entrar</span>
                  <span className="font-semibold">Minha Conta</span>
                </div>
              </Link>
            )}

            <button
              onClick={() => setIsOpen(true)}
              className="relative flex items-center gap-2 p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ShoppingCart className="h-5 w-5" />
              <div className="hidden sm:flex flex-col text-xs leading-tight">
                <span className="text-muted-foreground">Carrinho</span>
                <span className="font-semibold">{totalItems} {totalItems === 1 ? "item" : "itens"}</span>
              </div>
              {totalItems > 0 && (
                <span className="absolute -top-0.5 left-5 sm:hidden h-5 w-5 rounded-full bg-destructive text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>

            <Link to="/cadastro-loja">
              <Button size="sm" className="hidden lg:flex bg-hero-gradient text-primary-foreground border-0 hover:opacity-90 ml-2 rounded-xl gap-1">
                <Tag className="h-3.5 w-3.5" /> Quero Vender
              </Button>
            </Link>
          </div>
        </div>

        {/* Navigation bar */}
        <nav className="hidden lg:block border-t border-border bg-card">
          <div className="container flex items-center h-11">
            {/* All Categories dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setShowCategories(true)}
              onMouseLeave={() => { setShowCategories(false); setHoveredCat(null); }}
            >
              <button className="flex items-center gap-2 h-11 px-5 bg-primary text-primary-foreground text-sm font-semibold rounded-t-none hover:bg-primary/90 transition-colors">
                <Menu className="h-4 w-4" />
                Todas Categorias
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {showCategories && (
                <div className="absolute top-full left-0 flex z-50">
                  {/* Categories list */}
                  <div className="w-60 bg-card border border-border rounded-bl-xl shadow-lg py-1 max-h-[70vh] overflow-y-auto">
                    {globalCategories.map((cat) => {
                      const hasSubs = cat.subcategories && cat.subcategories.length > 0;
                      return (
                        <Link
                          key={cat.id}
                          to={`/categoria/${cat.slug}`}
                          className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${hoveredCat === cat.id ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"}`}
                          onMouseEnter={() => setHoveredCat(cat.id)}
                          onClick={() => { setShowCategories(false); setHoveredCat(null); }}
                        >
                          <span className="text-lg shrink-0">{cat.icon}</span>
                          <span className="flex-1 truncate">{cat.name}</span>
                          {hasSubs ? (
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          ) : (
                            <span className="text-xs text-muted-foreground shrink-0">{cat.productCount}</span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                  {/* Subcategories flyout */}
                  {hoveredCat && (() => {
                    const cat = globalCategories.find((c) => c.id === hoveredCat);
                    if (!cat || !cat.subcategories || cat.subcategories.length === 0) return null;
                    return (
                      <div className="w-56 bg-card border border-l-0 border-border rounded-br-xl shadow-lg py-2"
                        onMouseEnter={() => setHoveredCat(hoveredCat)}>
                        <p className="px-4 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          {cat.icon} {cat.name}
                        </p>
                        <Link
                          to={`/categoria/${cat.slug}`}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary hover:bg-accent transition-colors"
                          onClick={() => { setShowCategories(false); setHoveredCat(null); }}
                        >
                          Ver tudo ({cat.productCount})
                        </Link>
                        <div className="border-t border-border my-1" />
                        {cat.subcategories.map((sub) => (
                          <Link
                            key={sub.id}
                            to={`/categoria/${cat.slug}?sub=${sub.slug}`}
                            className="flex items-center justify-between px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                            onClick={() => { setShowCategories(false); setHoveredCat(null); }}
                          >
                            <span>{sub.name}</span>
                            <span className="text-[10px] text-muted-foreground">{sub.productCount}</span>
                          </Link>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Nav links */}
            <div className="flex items-center gap-1 ml-4">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  className="flex items-center gap-1.5 px-4 h-11 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        {/* Mobile menu */}
        {mobileMenu && (
          <div className="lg:hidden border-t border-border p-4 bg-card animate-fade-up max-h-[70vh] overflow-y-auto">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Estou à procura de..."
                className="w-full rounded-xl border border-border bg-secondary pl-10 pr-4 py-2.5 text-sm"
              />
            </div>

            <div className="flex flex-col">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  className="flex items-center gap-2 py-3 text-sm font-medium border-b border-border/50"
                  onClick={() => setMobileMenu(false)}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="mt-4 pt-2 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Categorias</p>
              <div className="grid grid-cols-2 gap-2">
                {globalCategories.map((cat) => (
                  <Link
                    key={cat.id}
                    to={`/categoria/${cat.slug}`}
                    className="flex items-center gap-2 p-2 rounded-lg bg-secondary text-sm"
                    onClick={() => setMobileMenu(false)}
                  >
                    <span>{cat.icon}</span>
                    <span className="truncate">{cat.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            <Link to="/cadastro-loja">
              <Button size="sm" className="w-full bg-hero-gradient text-primary-foreground border-0 mt-4 rounded-xl gap-1">
                <Tag className="h-3.5 w-3.5" /> Quero Vender
              </Button>
            </Link>
          </div>
        )}
      </header>
    </>
  );
}
