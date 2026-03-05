import { Link } from "react-router-dom";
import { useStoreSlug } from "@/hooks/useStoreSlug";
import { useStore, useStoreHeroSlides } from "@/hooks/useApi";
import { ProductCard } from "@/components/ProductCard";
import { ReviewSection } from "@/components/ReviewSection";
import { getCategoryTheme, defaultTheme } from "@/lib/categoryThemes";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import {
  Star, MapPin, MessageCircle, Clock, Heart, Phone, Mail,
  ChevronLeft, ChevronRight, Zap, Grid3X3, List,
  CheckCircle2, Truck, ShieldCheck, RotateCcw, Search,
  Instagram, Facebook, Globe, ExternalLink,
  CreditCard, Smartphone, Building2, Wallet, HandCoins, Banknote, QrCode,
  SlidersHorizontal, ChevronDown, X, Filter, Tag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { logoSrc, bannerSrc, productImgSrc, onImgError } from "@/lib/imageHelpers";
import StoreSeoHead from "@/components/StoreSeoHead";
import { useFollowStatus, useFollowToggle } from "@/hooks/useFollow";
import { useAuth } from "@/contexts/AuthContext";

/* ─── TikTok Icon ─── */
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.98a8.21 8.21 0 0 0 4.76 1.52V7.05a4.84 4.84 0 0 1-1-.36z" />
    </svg>
  );
}

/* ─── Store Hero Slider ─── */
function StoreHeroSlider({ storeSlug }: { storeSlug: string }) {
  const { data: slides = [] } = useStoreHeroSlides(storeSlug);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => setCurrent((p) => (p + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) return null;
  const slide = slides[current];

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.35 }}
          className={`${!slide.bgColor || slide.bgColor === "none" ? "bg-gray-900" : `bg-gradient-to-r ${slide.bgColor}`} px-8 py-14 sm:px-12 sm:py-20 text-primary-foreground relative overflow-hidden`}
        >
          {slide.image && (
            <img src={slide.image} alt="" className={`absolute inset-0 w-full h-full object-cover ${!slide.bgColor || slide.bgColor === "none" ? "" : "mix-blend-overlay opacity-60"}`} />
          )}
          <div className="max-w-lg relative z-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-2 leading-tight">{slide.title}</h2>
            {slide.subtitle && <p className="text-primary-foreground/80 text-sm mb-5">{slide.subtitle}</p>}
            {slide.cta && slide.ctaLink && (
              <Link
                to={slide.ctaLink}
                className="inline-block rounded-xl bg-card text-foreground px-6 py-2.5 font-semibold text-sm hover:opacity-90 transition-opacity shadow-md"
              >
                {slide.cta} →
              </Link>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
      {slides.length > 1 && (
        <>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={`h-2 rounded-full transition-all ${i === current ? "w-6 bg-primary-foreground" : "w-2 bg-primary-foreground/40"}`} />
            ))}
          </div>
          <button onClick={() => setCurrent((p) => (p - 1 + slides.length) % slides.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-card/20 backdrop-blur flex items-center justify-center text-primary-foreground hover:bg-card/40">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => setCurrent((p) => (p + 1) % slides.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-card/20 backdrop-blur flex items-center justify-center text-primary-foreground hover:bg-card/40">
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}

/* ─── Flash countdown ─── */
function useCountdown() {
  const endOfDay = useMemo(() => {
    const d = new Date(); d.setHours(23, 59, 59, 999); return d;
  }, []);
  const [left, setLeft] = useState(calc(endOfDay));
  useEffect(() => {
    const t = setInterval(() => setLeft(calc(endOfDay)), 1000);
    return () => clearInterval(t);
  }, [endOfDay]);
  return left;
}
function calc(target: Date) {
  const d = Math.max(0, target.getTime() - Date.now());
  return { h: Math.floor(d / 3600000), m: Math.floor((d % 3600000) / 60000), s: Math.floor((d % 60000) / 1000) };
}

/* ─── Main Page ─── */
const StoreDetail = () => {
  const slug = useStoreSlug();
  const { data: storeData, isLoading } = useStore(slug || "");
  const { data: siteSettings } = useSiteSettings();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"relevance" | "price-asc" | "price-desc" | "rating">("relevance");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewGrid, setViewGrid] = useState(true);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [badgeFilter, setBadgeFilter] = useState<string | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const countdown = useCountdown();
  const { isAuthenticated } = useAuth();
  const { data: followData } = useFollowStatus(storeData?.id || "");
  const followMutation = useFollowToggle(storeData?.id || "");

  // ─── All useMemo hooks MUST be called before any early return ───
  const allStoreProducts = storeData?.products || [];
  const promoProducts = allStoreProducts.filter((p) => p.badge === "Promo");

  // Build category tree: { category -> subcategories[] }
  const categoryTree = useMemo(() => {
    const tree: Record<string, { count: number; subs: Record<string, number> }> = {};
    allStoreProducts.forEach((p) => {
      if (!tree[p.category]) tree[p.category] = { count: 0, subs: {} };
      tree[p.category].count++;
      if (p.subcategory) {
        tree[p.category].subs[p.subcategory] = (tree[p.category].subs[p.subcategory] || 0) + 1;
      }
    });
    return tree;
  }, [allStoreProducts]);

  // Price range from products
  const priceRange = useMemo(() => {
    if (allStoreProducts.length === 0) return { min: 0, max: 0 };
    const prices = allStoreProducts.map((p) => p.price);
    return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) };
  }, [allStoreProducts]);

  // Badges available
  const availableBadges = useMemo(() => {
    const badges = new Set<string>();
    allStoreProducts.forEach((p) => { if (p.badge) badges.add(p.badge); });
    return [...badges];
  }, [allStoreProducts]);

  if (isLoading) {
    return (
      <main className="container py-16 text-center min-h-screen">
        <div className="h-8 w-48 bg-secondary animate-pulse rounded mx-auto" />
      </main>
    );
  }

  if (!storeData) {
    return (
      <main className="container py-16 text-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Loja não encontrada</h1>
        <Link to="/lojas" className="text-primary hover:underline">Ver todas as lojas</Link>
      </main>
    );
  }

  const store = storeData;
  const themesEnabled = siteSettings?.category_themes_enabled !== false;
  const theme = themesEnabled ? getCategoryTheme(store.categories) : defaultTheme;

  let filtered = activeCategory
    ? allStoreProducts.filter((p) => p.category === activeCategory)
    : allStoreProducts;

  if (activeSubcategory) {
    filtered = filtered.filter((p) => p.subcategory === activeSubcategory);
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }

  if (priceMin) filtered = filtered.filter((p) => p.price >= Number(priceMin));
  if (priceMax) filtered = filtered.filter((p) => p.price <= Number(priceMax));
  if (badgeFilter) filtered = filtered.filter((p) => p.badge === badgeFilter);
  if (inStockOnly) filtered = filtered.filter((p) => p.stock > 0);

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "price-asc") return a.price - b.price;
    if (sortBy === "price-desc") return b.price - a.price;
    if (sortBy === "rating") return b.rating - a.rating;
    return 0;
  });

  const uniqueCategories = [...new Set(allStoreProducts.map((p) => p.category))];
  const formatPrice = (val: number) => new Intl.NumberFormat("pt-AO").format(val);

  const toggleCat = (cat: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const clearFilters = () => {
    setActiveCategory(null);
    setActiveSubcategory(null);
    setPriceMin("");
    setPriceMax("");
    setBadgeFilter(null);
    setInStockOnly(false);
    setSearchQuery("");
  };

  const hasActiveFilters = activeCategory || activeSubcategory || priceMin || priceMax || badgeFilter || inStockOnly || searchQuery;

  const SidebarContent = () => (
    <div className="space-y-5">
      {/* Categories & Subcategories */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5" /> Categorias
        </h4>
        <div className="space-y-0.5">
          <button onClick={() => { setActiveCategory(null); setActiveSubcategory(null); }}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              !activeCategory ? `${theme.pillActive}` : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}>
            Todos os Produtos ({allStoreProducts.length})
          </button>
          {Object.entries(categoryTree).map(([cat, data]) => {
            const isActive = activeCategory === cat;
            const hasSubs = Object.keys(data.subs).length > 0;
            const isExpanded = expandedCats.has(cat) || isActive;
            return (
              <div key={cat}>
                <div className="flex items-center">
                  <button onClick={() => { setActiveCategory(cat); setActiveSubcategory(null); if (hasSubs && !isExpanded) toggleCat(cat); }}
                    className={`flex-1 text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isActive && !activeSubcategory ? `${theme.pillActive}` : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}>
                    {cat} ({data.count})
                  </button>
                  {hasSubs && (
                    <button onClick={() => toggleCat(cat)} className="p-1 text-muted-foreground hover:text-foreground">
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </button>
                  )}
                </div>
                {hasSubs && isExpanded && (
                  <div className="ml-4 pl-3 border-l border-border space-y-0.5 mt-0.5">
                    {Object.entries(data.subs).map(([sub, count]) => (
                      <button key={sub} onClick={() => { setActiveCategory(cat); setActiveSubcategory(sub); }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                          activeSubcategory === sub ? `${theme.pillActive}` : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        }`}>
                        {sub} ({count})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Preco (Kz)</h4>
        <div className="flex items-center gap-2">
          <input type="number" placeholder={String(priceRange.min)} value={priceMin} onChange={(e) => setPriceMin(e.target.value)}
            className="w-full text-xs px-2.5 py-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-ring" />
          <span className="text-muted-foreground text-xs">—</span>
          <input type="number" placeholder={String(priceRange.max)} value={priceMax} onChange={(e) => setPriceMax(e.target.value)}
            className="w-full text-xs px-2.5 py-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>

      {/* Badge Filter */}
      {availableBadges.length > 0 && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5" /> Etiqueta
          </h4>
          <div className="space-y-1">
            <button onClick={() => setBadgeFilter(null)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                !badgeFilter ? `${theme.pillActive}` : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}>Todas</button>
            {availableBadges.map((b) => (
              <button key={b} onClick={() => setBadgeFilter(b)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  badgeFilter === b ? `${theme.pillActive}` : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}>
                {b === "Promo" ? "🔥 Promocao" : b === "Novo" ? "✨ Novo" : b}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* In-stock toggle */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg hover:bg-secondary transition-colors">
          <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-border accent-primary" />
          <span className="text-xs font-medium text-muted-foreground">Apenas em stock</span>
        </label>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button onClick={clearFilters}
          className="flex items-center gap-1.5 w-full px-3 py-2 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors">
          <X className="h-3.5 w-3.5" /> Limpar Filtros
        </button>
      )}
    </div>
  );

  return (
    <main className="min-h-screen bg-secondary/30">
      <StoreSeoHead
        storeName={store.name}
        storeSlug={store.slug}
        storeDescription={store.description}
        storeLogo={store.logo}
        metaTitle={store.metaTitle}
        metaDescription={store.metaDescription}
        metaKeywords={store.metaKeywords}
      />
      {/* ─── Banner + Store Info ─── */}
      <div className="relative">
        <div className="h-48 sm:h-60 overflow-hidden bg-gradient-to-r from-primary to-primary/80">
          <img src={bannerSrc(store.banner)} alt={`Banner ${store.name}`} className="w-full h-full object-cover block" onError={onImgError("banner")} />
          <div className="absolute inset-0 h-48 sm:h-60" style={{ background: theme.bannerGradient }} />
        </div>
        <div className="container relative -mt-24 z-10 pb-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <img src={logoSrc(store.logo, store.name)} alt={store.name}
              className="h-24 w-24 rounded-2xl border-4 border-card shadow-lg bg-card" onError={onImgError("logo", store.name)} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-extrabold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">{store.name}</h1>
                {store.isOfficial && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/90 text-white text-[10px] font-bold shadow-lg backdrop-blur-sm" title="Loja Oficial SuperLojas">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Oficial
                  </span>
                )}
              </div>
              <p className="text-sm text-white/90 max-w-lg drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">{store.description}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{store.province}, {store.city}</span>
                <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-warning text-warning" />{store.rating} ({store.reviewCount})</span>
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />08:00 - 18:00</span>
                <span className="flex items-center gap-1">{allStoreProducts.length} produtos</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <a href={`https://wa.me/${store.whatsapp.replace(/\+/g, "")}`} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90 gap-1 rounded-xl text-xs h-8">
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </Button>
                </a>
                {isAuthenticated ? (
                  <Button
                    variant={followData?.is_following ? "default" : "outline"}
                    size="sm"
                    className={`gap-1 rounded-xl text-xs h-8 ${followData?.is_following ? "bg-primary text-primary-foreground" : "bg-card/80 backdrop-blur border-border"}`}
                    onClick={() => followMutation.mutate(followData?.is_following ? "unfollow" : "follow")}
                    disabled={followMutation.isPending}
                  >
                    <Heart className={`h-3.5 w-3.5 ${followData?.is_following ? "fill-current" : ""}`} />
                    {followData?.is_following ? "Seguindo" : "Seguir Loja"}
                    {followData?.followers_count ? ` (${followData.followers_count})` : ""}
                  </Button>
                ) : (
                  <Link to="/entrar">
                    <Button variant="outline" size="sm" className="gap-1 rounded-xl text-xs h-8 bg-card/80 backdrop-blur border-border">
                      <Heart className="h-3.5 w-3.5" /> Seguir Loja
                    </Button>
                  </Link>
                )}
                <Button variant="outline" size="sm" className="gap-1 rounded-xl text-xs h-8 bg-card/80 backdrop-blur border-border">
                  <Phone className="h-3.5 w-3.5" /> Ligar
                </Button>
                {/* Social Media */}
                {store.socials?.instagram && (
                  <a href={`https://instagram.com/${store.socials.instagram}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl bg-card/80 backdrop-blur border-border">
                      <Instagram className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                )}
                {store.socials?.facebook && (
                  <a href={`https://facebook.com/${store.socials.facebook}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl bg-card/80 backdrop-blur border-border">
                      <Facebook className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                )}
                {store.socials?.tiktok && (
                  <a href={`https://tiktok.com/@${store.socials.tiktok}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl bg-card/80 backdrop-blur border-border">
                      <TikTokIcon className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                )}
                {store.socials?.website && (
                  <a href={store.socials.website} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl bg-card/80 backdrop-blur border-border">
                      <Globe className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Store Navigation ─── */}
      <div className="sticky top-16 z-40 bg-card border-b border-border">
        <div className="container">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide h-11 text-sm">
            <button onClick={() => { setActiveCategory(null); setActiveSubcategory(null); }}
              className={`px-4 h-full shrink-0 font-medium transition-colors border-b-2 ${!activeCategory ? theme.navActive : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              Início
            </button>
            {uniqueCategories.map((cat) => (
              <button key={cat} onClick={() => { setActiveCategory(cat); setActiveSubcategory(null); }}
                className={`px-4 h-full shrink-0 font-medium transition-colors border-b-2 ${activeCategory === cat ? theme.navActive : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container py-6">
        {/* ─── Hero Slider ─── */}
        {!activeCategory && (
          <section className="mb-8">
            <StoreHeroSlider storeSlug={store.slug} />
          </section>
        )}

        {/* ─── Flash Deals ─── */}
        {!activeCategory && promoProducts.length > 0 && (
          <section className="mb-8">
            <div className={`rounded-2xl border ${theme.flashAccent} bg-card overflow-hidden`}>
              <div className={`flex items-center justify-between px-5 py-3 ${theme.accentBgLight} border-b ${theme.highlightBorder}`}>
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-destructive flex items-center justify-center">
                    <Zap className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                  <h3 className="font-bold text-sm">Flash Sale</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground font-medium mr-1">Termina em</span>
                  {[
                    { v: countdown.h, l: "h" },
                    { v: countdown.m, l: "m" },
                    { v: countdown.s, l: "s" },
                  ].map(({ v, l }) => (
                    <span key={l} className="bg-foreground text-background text-xs font-bold px-1.5 py-0.5 rounded-md min-w-[26px] text-center">
                      {String(v).padStart(2, "0")}{l}
                    </span>
                  ))}
                </div>
              </div>
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {promoProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── Policies ─── */}
        {!activeCategory && (
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              { icon: <Truck className={`h-5 w-5 ${theme.policyIconColor}`} />, title: "Entrega Rápida", desc: "2-5 dias úteis" },
              { icon: <ShieldCheck className={`h-5 w-5 ${theme.policyIconColor}`} />, title: "Garantia", desc: "Produtos originais" },
              { icon: <RotateCcw className={`h-5 w-5 ${theme.policyIconColor}`} />, title: "Devoluções", desc: "Até 7 dias" },
              { icon: <MessageCircle className={`h-5 w-5 ${theme.policyIconColor}`} />, title: "Suporte", desc: "WhatsApp 24h" },
            ].map((item) => (
              <div key={item.title} className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border">
                {item.icon}
                <div>
                  <p className="text-xs font-semibold">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* ─── Products with Sidebar ─── */}
        <section>
          <div className="flex gap-6">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:block w-64 shrink-0">
              <div className="sticky top-[7.5rem] rounded-2xl border border-border bg-card p-4">
                <SidebarContent />
              </div>
            </aside>

            {/* Mobile Filter Button */}
            <div className="lg:hidden fixed bottom-4 right-4 z-50">
              <button onClick={() => setMobileSidebar(true)}
                className={`flex items-center gap-2 px-4 py-3 rounded-full shadow-lg text-xs font-semibold text-primary-foreground ${theme.pillActive} bg-primary`}>
                <SlidersHorizontal className="h-4 w-4" /> Filtros
                {hasActiveFilters && <span className="h-2 w-2 rounded-full bg-destructive" />}
              </button>
            </div>

            {/* Mobile Sidebar Overlay */}
            {mobileSidebar && (
              <div className="fixed inset-0 z-50 lg:hidden">
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileSidebar(false)} />
                <aside className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-card border-l border-border overflow-y-auto">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4" /> Filtros
                    </h3>
                    <button onClick={() => setMobileSidebar(false)} className="p-1 text-muted-foreground hover:text-foreground">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="p-4">
                    <SidebarContent />
                  </div>
                </aside>
              </div>
            )}

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-bold">
                    {activeSubcategory || activeCategory || "Todos os Produtos"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {sorted.length} produto{sorted.length !== 1 ? "s" : ""}
                    {hasActiveFilters && <span className="ml-1 text-primary cursor-pointer hover:underline" onClick={clearFilters}>(limpar filtros)</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input type="text" placeholder="Buscar nesta loja..." value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-card w-40 sm:w-52 focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="text-xs border border-border rounded-lg px-3 py-1.5 bg-card focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="relevance">Relevância</option>
                    <option value="price-asc">Preço ↑</option>
                    <option value="price-desc">Preço ↓</option>
                    <option value="rating">Avaliação</option>
                  </select>
                  <div className="hidden sm:flex border border-border rounded-lg overflow-hidden">
                    <button onClick={() => setViewGrid(true)}
                      className={`p-1.5 ${viewGrid ? `${theme.pillActive}` : "bg-card text-muted-foreground"}`}>
                      <Grid3X3 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setViewGrid(false)}
                      className={`p-1.5 ${!viewGrid ? `${theme.pillActive}` : "bg-card text-muted-foreground"}`}>
                      <List className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {sorted.length > 0 ? (
                <div className={viewGrid ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3" : "flex flex-col gap-3"}>
                  {sorted.map((p) =>
                    viewGrid ? (
                      <ProductCard key={p.id} product={p} />
                    ) : (
                      <Link key={p.id} to={`/produto/${p.slug}`}
                        className="flex gap-4 p-3 rounded-xl border border-border bg-card hover:shadow-card-hover transition-all">
                        <img src={productImgSrc(p.images[0])} alt={p.name} className="h-24 w-24 rounded-lg object-cover bg-secondary" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-primary font-medium">{p.store.name}</p>
                          <h3 className="text-sm font-medium truncate">{p.name}</h3>
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="h-3 w-3 fill-warning text-warning" />
                            <span className="text-[10px] text-muted-foreground">{p.rating}</span>
                            {p.badge && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ml-1 ${p.badge === "Promo" ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
                                {p.badge}
                              </span>
                            )}
                          </div>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="font-bold text-sm">{formatPrice(p.price)} Kz</span>
                            {p.originalPrice && (
                              <span className="text-[10px] text-muted-foreground line-through">{formatPrice(p.originalPrice)} Kz</span>
                            )}
                          </div>
                        </div>
                      </Link>
                    )
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Nenhum produto encontrado.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ─── Payment Methods ─── */}
        {store.paymentMethods && store.paymentMethods.filter((pm: any) => pm.is_active).length > 0 && (
          <section className="mt-10">
            <h3 className="font-bold mb-3 flex items-center gap-2"><CreditCard className={`h-4 w-4 ${theme.accentText}`} /> Formas de Pagamento</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {store.paymentMethods.filter((pm: any) => pm.is_active).map((pm: any, i: number) => {
                const icons: Record<string, any> = { multicaixa_express: Smartphone, transfer: Building2, cash_delivery: HandCoins, cash_pickup: Wallet, deposit: Banknote, qr_code: QrCode, other: CreditCard };
                const colors: Record<string, string> = { multicaixa_express: "text-orange-500 bg-orange-50", transfer: "text-blue-500 bg-blue-50", cash_delivery: "text-emerald-500 bg-emerald-50", cash_pickup: "text-purple-500 bg-purple-50", deposit: "text-cyan-500 bg-cyan-50", qr_code: "text-pink-500 bg-pink-50", other: "text-gray-500 bg-gray-50" };
                const Icon = icons[pm.type] || CreditCard;
                const colorClass = colors[pm.type] || "text-gray-500 bg-gray-50";
                const [iconColor, iconBg] = colorClass.split(" ");
                return (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border">
                    <div className={`h-9 w-9 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
                      <Icon className={`h-4 w-4 ${iconColor}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold">{pm.label}</p>
                      {pm.account && <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{pm.account}</p>}
                      {pm.details && <p className="text-[10px] text-muted-foreground mt-0.5">{pm.details}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── Contact / About / Social ─── */}
        <section className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-bold mb-3">Sobre a Loja</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">{store.description}</p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2"><MapPin className={`h-4 w-4 ${theme.accentText}`} /> {store.province}, {store.city}</p>
              <p className="flex items-center gap-2"><Clock className={`h-4 w-4 ${theme.accentText}`} /> Seg - Sáb: 08:00 - 18:00</p>
              <p className="flex items-center gap-2"><Phone className={`h-4 w-4 ${theme.accentText}`} /> {store.whatsapp}</p>
              <p className="flex items-center gap-2"><Mail className={`h-4 w-4 ${theme.accentText}`} /> contacto@{store.slug}.ao</p>
            </div>
            {/* Social links */}
            {store.socials && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-semibold mb-2">Redes Sociais</p>
                <div className="flex gap-2">
                  {store.socials.instagram && (
                    <a href={`https://instagram.com/${store.socials.instagram}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs hover:bg-accent transition-colors">
                      <Instagram className="h-3.5 w-3.5" /> @{store.socials.instagram}
                    </a>
                  )}
                  {store.socials.facebook && (
                    <a href={`https://facebook.com/${store.socials.facebook}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs hover:bg-accent transition-colors">
                      <Facebook className="h-3.5 w-3.5" /> Facebook
                    </a>
                  )}
                  {store.socials.tiktok && (
                    <a href={`https://tiktok.com/@${store.socials.tiktok}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs hover:bg-accent transition-colors">
                      <TikTokIcon className="h-3.5 w-3.5" /> TikTok
                    </a>
                  )}
                  {store.socials.website && (
                    <a href={store.socials.website} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs hover:bg-accent transition-colors">
                      <Globe className="h-3.5 w-3.5" /> Website
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <ReviewSection
              type="store"
              targetId={store.id}
              targetName={store.name}
              averageRating={store.rating}
              totalReviews={store.reviewCount}
            />
          </div>
        </section>
      </div>
    </main>
  );
};

export default StoreDetail;
