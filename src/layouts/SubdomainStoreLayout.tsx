import { useSubdomainStore } from "@/contexts/SubdomainStoreContext";
import { getMainSiteUrl } from "@/hooks/useSubdomain";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { CartDrawer } from "@/components/CartDrawer";
import { ProductCard } from "@/components/ProductCard";
import { ReviewSection } from "@/components/ReviewSection";
import StoreDetail from "@/pages/StoreDetail";
import ProductDetail from "@/pages/ProductDetail";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import Auth from "@/pages/Auth";
import {
  Store, ShoppingCart, Heart, User, ExternalLink, MapPin, Phone,
  Mail, MessageCircle, Star, Loader2, AlertTriangle, ArrowUpRight,
  BadgeCheck, Menu, X
} from "lucide-react";
import { logoSrc, bannerSrc, onImgError } from "@/lib/imageHelpers";
import { useState } from "react";
import StoreSeoHead from "@/components/StoreSeoHead";

function SubdomainHeader() {
  const { store } = useSubdomainStore();
  const { user } = useAuth();
  const { items } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mainSite = getMainSiteUrl();

  if (!store) return null;

  const cartCount = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
      <div className="container flex items-center justify-between h-14 gap-4">
        {/* Logo + Name */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <img
            src={logoSrc(store.logo, store.name)}
            alt={store.name}
            className="h-8 w-8 rounded-lg object-cover"
            onError={onImgError("logo", store.name)}
          />
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold leading-tight flex items-center gap-1">
              {store.name}
              {store.is_official && <BadgeCheck className="h-3.5 w-3.5 text-blue-500" />}
            </h1>
            <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <MapPin className="h-2.5 w-2.5" /> {store.province}, {store.city}
            </p>
          </div>
        </Link>

        {/* Nav links (desktop) */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium">
          <Link to="/" className="hover:text-primary transition-colors">Inicio</Link>
          <Link to="/produtos" className="hover:text-primary transition-colors">Produtos</Link>
          <Link to="/contacto" className="hover:text-primary transition-colors">Contacto</Link>
          <a href={mainSite} className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
            SuperLojas <ExternalLink className="h-3 w-3" />
          </a>
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <Link to="/carrinho" className="relative p-2 rounded-lg hover:bg-secondary transition-colors">
            <ShoppingCart className="h-4.5 w-4.5" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
          {user ? (
            <Link to="/entrar" className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <User className="h-4.5 w-4.5" />
            </Link>
          ) : (
            <Link to="/entrar" className="text-xs font-medium px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              Entrar
            </Link>
          )}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg hover:bg-secondary">
            {mobileOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card px-4 py-3 space-y-2">
          <Link to="/" onClick={() => setMobileOpen(false)} className="block text-sm py-1.5 hover:text-primary">Inicio</Link>
          <Link to="/produtos" onClick={() => setMobileOpen(false)} className="block text-sm py-1.5 hover:text-primary">Produtos</Link>
          <Link to="/contacto" onClick={() => setMobileOpen(false)} className="block text-sm py-1.5 hover:text-primary">Contacto</Link>
          <a href={mainSite} className="block text-sm py-1.5 text-muted-foreground hover:text-primary">
            SuperLojas <ExternalLink className="inline h-3 w-3" />
          </a>
        </div>
      )}
    </header>
  );
}

function SubdomainFooter() {
  const { store } = useSubdomainStore();
  const mainSite = getMainSiteUrl();
  if (!store) return null;

  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="container py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Store info */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src={logoSrc(store.logo, store.name)} alt="" className="h-8 w-8 rounded-lg object-cover" onError={onImgError("logo", store.name)} />
              <h3 className="font-bold text-sm">{store.name}</h3>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-3">{store.description}</p>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-xs mb-3">Contacto</h4>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              {store.phone && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {store.phone}</p>}
              {store.email && <p className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {store.email}</p>}
              {store.whatsapp && <p className="flex items-center gap-1.5"><MessageCircle className="h-3 w-3" /> {store.whatsapp}</p>}
              <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {store.province}, {store.city}</p>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-xs mb-3">Links</h4>
            <div className="space-y-1.5 text-xs">
              <a href={mainSite} className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
                Visitar SuperLojas <ArrowUpRight className="h-3 w-3" />
              </a>
              <Link to="/carrinho" className="block text-muted-foreground hover:text-primary transition-colors">Carrinho</Link>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} {store.name}. Todos os direitos reservados.</p>
          <p>Powered by <a href={mainSite} className="text-primary hover:underline">SuperLojas</a></p>
        </div>
      </div>
    </footer>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">A carregar loja...</p>
      </div>
    </div>
  );
}

function ErrorScreen({ message, needsUpgrade }: { message: string; needsUpgrade: boolean }) {
  const mainSite = getMainSiteUrl();
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-4">
      <div className="text-center max-w-md">
        <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
        <h1 className="text-lg font-bold mb-2">
          {needsUpgrade ? "Subdominio nao disponivel" : "Loja nao encontrada"}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">{message}</p>
        {needsUpgrade && (
          <p className="text-xs text-muted-foreground mb-4">
            O plano actual desta loja nao inclui subdominio personalizado.
            E necessario fazer upgrade para o plano Premium ou Empresarial.
          </p>
        )}
        <a href={mainSite} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Store className="h-4 w-4" /> Ir para SuperLojas
        </a>
      </div>
    </div>
  );
}

export default function SubdomainStoreLayout() {
  const { store, loading, error, needsUpgrade, storeSlug } = useSubdomainStore();

  if (loading) return <LoadingScreen />;
  if (error || !store) return <ErrorScreen message={error || "Loja nao encontrada"} needsUpgrade={needsUpgrade} />;

  return (
    <div className="min-h-screen flex flex-col">
      <StoreSeoHead
        storeName={store.name}
        storeSlug={store.slug}
        storeDescription={store.description}
        storeLogo={store.logo ?? undefined}
        metaTitle={store.meta_title ?? undefined}
        metaDescription={store.meta_description ?? undefined}
        metaKeywords={store.meta_keywords ?? undefined}
        isSubdomain={true}
      />
      <SubdomainHeader />
      <CartDrawer />
      <main className="flex-1">
        <Routes>
          {/* Home = Store detail page */}
          <Route path="/" element={<StoreDetail />} />
          <Route path="/produtos" element={<StoreDetail />} />
          <Route path="/produto/:slug" element={<ProductDetail />} />
          <Route path="/carrinho" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/entrar" element={<Auth />} />
          <Route path="/contacto" element={<StoreDetail />} />
          <Route path="*" element={<StoreDetail />} />
        </Routes>
      </main>
      <SubdomainFooter />
    </div>
  );
}
