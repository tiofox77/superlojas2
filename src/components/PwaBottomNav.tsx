import { Link, useLocation } from "react-router-dom";
import { Home, Search, ShoppingCart, Heart, User, Store, Zap, Grid3X3 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useAuth } from "@/contexts/AuthContext";
import { useIsPwa } from "@/hooks/usePwaUpdate";

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
}

export default function PwaBottomNav() {
  const isPwa = useIsPwa();
  const { pathname } = useLocation();
  const { totalItems: cartCount } = useCart();
  const { totalItems: wishlistCount } = useWishlist();
  const { isAuthenticated } = useAuth();

  // Only show in standalone PWA mode
  if (!isPwa) return null;

  // Don't show in admin or store panel
  if (pathname.startsWith("/admin") || pathname.includes("/painel")) return null;

  const items: NavItem[] = [
    { to: "/", icon: Home, label: "Início" },
    { to: "/categorias", icon: Grid3X3, label: "Categorias" },
    { to: "/ofertas", icon: Zap, label: "Ofertas" },
    { to: "/carrinho", icon: ShoppingCart, label: "Carrinho", badge: cartCount },
    { to: isAuthenticated ? "/minha-conta" : "/entrar", icon: User, label: "Conta" },
  ];

  const isActive = (to: string) => {
    if (to === "/") return pathname === "/";
    return pathname.startsWith(to);
  };

  return (
    <>
      {/* Spacer to prevent content from being hidden behind the nav */}
      <div className="h-16 md:hidden" />

      {/* Fixed bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around h-14 px-1">
          {items.map((item) => {
            const active = isActive(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 rounded-xl transition-colors ${
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="relative">
                  <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
                  {item.badge && item.badge > 0 ? (
                    <span className="absolute -top-1.5 -right-2.5 h-4 min-w-[16px] px-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  ) : null}
                </div>
                <span className={`text-[10px] leading-tight ${active ? "font-semibold" : "font-medium"}`}>
                  {item.label}
                </span>
                {active && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
