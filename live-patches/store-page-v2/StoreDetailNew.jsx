// Store page (/lojas/:slug and the store subdomain routes) — replacement for the
// `Nl` component inside the production bundle. The Sep-2026 frontend source was
// never committed, so this is spliced into the built bundle; everything here
// references the bundle's own (minified) bindings through the aliases below.
const Nl = () => {
  // ── Bundle bindings ──────────────────────────────────────────────────────
  const React = d;
  const Link = ce;
  const Button = Fe;
  const ProductCard = En;
  const StoreSeoHead = qk;
  const StoreHeroSlider = uR;
  const ReviewSection = Uk;
  const TikTokIcon = Wv;
  const useLocation = ds;
  const useStoreSlug = lR;
  const useStore = HD;
  const useSiteSettings = Yi;
  const useCountdown = mR;
  const getCategoryTheme = cR;
  const defaultTheme = Wx;
  const bannerSrc = Vk;
  const logoSrc = pa;
  const productImgSrc = Ca;
  const onImgError = ys;
  const socialUrl = ul;
  const Icon = {
    CheckCircle: Ie, MapPin: $t, Star: ht, Clock: rt, MessageCircle: Ra, Phone: cs,
    Instagram: sc, Facebook: tc, Globe: st, Zap: Cn, Truck: ir, ShieldCheck: rr,
    RotateCcw: QC, Search: xt, Grid: _i, List: xm, CreditCard: mt, Smartphone: $a,
    Building: pm, HandCoins: _w, Wallet: Jf, Banknote: ri, QrCode: Lw, Mail: Vt,
    Sliders: Dw, X: Je, Sparkles: mo, Tag: Xt, Package: Be, Store: He, Calendar: hm,
  };

  // ── Constants & helpers ──────────────────────────────────────────────────
  const PAGE_SIZE = 24;
  const NEW_BADGE_DAYS = 14;
  const NEW_FILTER_DAYS = 30;
  const WEEK = ["Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado", "Domingo"];
  const JS_DAYS = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"];
  const DAY_LABEL = {
    Segunda: "Segunda", Terca: "Terça", Quarta: "Quarta", Quinta: "Quinta",
    Sexta: "Sexta", Sabado: "Sábado", Domingo: "Domingo",
  };
  // Lower bounds are exclusive after the first range so a price never falls in two.
  const PRICE_RANGES = [
    { key: "r1", min: 0, max: 5000, label: "Até 5.000 Kz" },
    { key: "r2", min: 5000.01, max: 15000, label: "5.000 – 15.000 Kz" },
    { key: "r3", min: 15000.01, max: 50000, label: "15.000 – 50.000 Kz" },
    { key: "r4", min: 50000.01, max: Infinity, label: "Mais de 50.000 Kz" },
  ];
  const SORTS = [
    { value: "recent", label: "Mais recentes" },
    { value: "price-asc", label: "Menor preço" },
    { value: "price-desc", label: "Maior preço" },
    { value: "discount", label: "Maiores descontos" },
    { value: "rating", label: "Melhor avaliados" },
    { value: "name", label: "Nome (A–Z)" },
  ];

  const formatKz = (value) => new Intl.NumberFormat("pt-AO").format(Number(value) || 0);
  const createdTime = (product) => {
    const t = product && product.createdAt ? Date.parse(product.createdAt) : NaN;
    return Number.isFinite(t) ? t : 0;
  };
  const newerFirst = (a, b) => createdTime(b) - createdTime(a) || Number(b.id) - Number(a.id);
  const ageInDays = (product) => {
    const t = createdTime(product);
    return t ? (Date.now() - t) / 86400000 : Infinity;
  };
  const discountPct = (product) =>
    product.originalPrice && product.originalPrice > product.price
      ? Math.round((1 - product.price / product.originalPrice) * 100)
      : 0;
  const isPromo = (product) => product.badge === "Promo" || discountPct(product) > 0;
  const withNewBadge = (product) =>
    !product.badge && ageInDays(product) <= NEW_BADGE_DAYS ? { ...product, badge: "Novo" } : product;

  const luandaNow = () => {
    try {
      return new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Luanda" }));
    } catch (err) {
      return new Date();
    }
  };
  const toMinutes = (hhmm) => {
    const [h, m] = String(hhmm || "").split(":").map(Number);
    return Number.isFinite(h) ? h * 60 + (Number.isFinite(m) ? m : 0) : null;
  };
  const hoursFor = (hours, day) =>
    (hours || []).find((entry) => String(entry.day || "").toLowerCase() === day.toLowerCase());
  const openStatus = (hours) => {
    if (!Array.isArray(hours) || hours.length === 0) return null;
    const now = luandaNow();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const today = hoursFor(hours, JS_DAYS[now.getDay()]);
    if (today && today.active) {
      const open = toMinutes(today.open);
      const close = toMinutes(today.close);
      if (open !== null && close !== null && minutes >= open && minutes < close) {
        return { open: true, text: `Aberto agora · até ${today.close}` };
      }
      if (open !== null && minutes < open) {
        return { open: false, text: `Fechado · abre hoje às ${today.open}` };
      }
    }
    for (let i = 1; i <= 7; i++) {
      const name = JS_DAYS[(now.getDay() + i) % 7];
      const next = hoursFor(hours, name);
      if (next && next.active && next.open) {
        const when = i === 1 ? "amanhã" : DAY_LABEL[name].toLowerCase();
        return { open: false, text: `Fechado · abre ${when} às ${next.open}` };
      }
    }
    return { open: false, text: "Fechado" };
  };

  // ── State ────────────────────────────────────────────────────────────────
  const location = useLocation();
  const slug = useStoreSlug();
  const { data: storeData, isLoading } = useStore(slug || "");
  const { data: siteSettings } = useSiteSettings();
  const countdown = useCountdown();
  const [category, setCategory] = React.useState(null);
  const [subcategory, setSubcategory] = React.useState(null);
  const [sortBy, setSortBy] = React.useState("recent");
  const [search, setSearch] = React.useState("");
  const [priceRange, setPriceRange] = React.useState(null);
  const [customMin, setCustomMin] = React.useState("");
  const [customMax, setCustomMax] = React.useState("");
  const [onlyPromo, setOnlyPromo] = React.useState(false);
  const [onlyNew, setOnlyNew] = React.useState(false);
  const [viewGrid, setViewGrid] = React.useState(true);
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  // Keep the subdomain deep links (/produtos, /contacto) scrolling to their section.
  React.useEffect(() => {
    const target =
      location.pathname === "/produtos" ? "produtos" : location.pathname === "/contacto" ? "contacto" : "topo-loja";
    requestAnimationFrame(() => {
      const el = document.getElementById(target);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [location.pathname, storeData]);

  React.useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [category, subcategory, sortBy, search, priceRange, onlyPromo, onlyNew]);

  React.useEffect(() => {
    if (!filtersOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [filtersOpen]);

  // Out-of-stock products are not listed on the store page.
  const inStock = React.useMemo(
    () => ((storeData && storeData.products) || []).filter((product) => Number(product.stock) > 0),
    [storeData]
  );

  const categories = React.useMemo(() => {
    const counts = new Map();
    inStock.forEach((product) => {
      if (product.category) counts.set(product.category, (counts.get(product.category) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt"));
  }, [inStock]);

  const scoped = React.useMemo(
    () =>
      inStock.filter(
        (product) =>
          (!category || product.category === category) &&
          (!subcategory || product.subcategoryName === subcategory)
      ),
    [inStock, category, subcategory]
  );

  const subcategories = React.useMemo(() => {
    if (!category) return [];
    const counts = new Map();
    inStock.forEach((product) => {
      if (product.category === category && product.subcategoryName) {
        counts.set(product.subcategoryName, (counts.get(product.subcategoryName) || 0) + 1);
      }
    });
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt"));
  }, [inStock, category]);

  const sorted = React.useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt");
    const list = scoped.filter(
      (product) =>
        (!priceRange || (product.price >= priceRange.min && product.price <= priceRange.max)) &&
        (!onlyPromo || isPromo(product)) &&
        (!onlyNew || ageInDays(product) <= NEW_FILTER_DAYS) &&
        (!query ||
          product.name.toLocaleLowerCase("pt").includes(query) ||
          String(product.category || "").toLocaleLowerCase("pt").includes(query) ||
          String(product.description || "").toLocaleLowerCase("pt").includes(query))
    );
    const compare = {
      recent: newerFirst,
      "price-asc": (a, b) => a.price - b.price || newerFirst(a, b),
      "price-desc": (a, b) => b.price - a.price || newerFirst(a, b),
      discount: (a, b) => discountPct(b) - discountPct(a) || newerFirst(a, b),
      rating: (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount || newerFirst(a, b),
      name: (a, b) => a.name.localeCompare(b.name, "pt"),
    }[sortBy] || newerFirst;
    return [...list].sort(compare);
  }, [scoped, priceRange, onlyPromo, onlyNew, search, sortBy]);

  // ── Early returns (all hooks above) ──────────────────────────────────────
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

  // ── Derived view data ────────────────────────────────────────────────────
  const store = storeData;
  const theme = (siteSettings && siteSettings.category_themes_enabled) !== false ? getCategoryTheme(store.categories) : defaultTheme;
  const socials = store.socials || {};
  const flashProducts = inStock.filter((product) => product.badge === "Promo");
  const status = openStatus(store.businessHours);
  const phone = store.phone || store.whatsapp;
  const memberSince = store.createdAt
    ? new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric" }).format(new Date(store.createdAt))
    : null;
  const minOrder = Number(store.minOrderValue) || 0;
  const todayName = JS_DAYS[luandaNow().getDay()];
  const promoCount = scoped.filter(isPromo).length;
  const newCount = scoped.filter((product) => ageInDays(product) <= NEW_FILTER_DAYS).length;
  const rangeCounts = PRICE_RANGES.map((range) => ({
    ...range,
    count: scoped.filter((product) => product.price >= range.min && product.price <= range.max).length,
  }));
  const activeFilters = (category ? 1 : 0) + (subcategory ? 1 : 0) + (priceRange ? 1 : 0) + (onlyPromo ? 1 : 0) + (onlyNew ? 1 : 0);
  const visible = sorted.slice(0, visibleCount);

  const chooseCategory = (name) => {
    setCategory(name);
    setSubcategory(null);
    setPriceRange(null);
  };
  const clearFilters = () => {
    setCategory(null);
    setSubcategory(null);
    setPriceRange(null);
    setCustomMin("");
    setCustomMax("");
    setOnlyPromo(false);
    setOnlyNew(false);
    setSearch("");
  };
  const applyCustomPrice = () => {
    const min = customMin === "" ? 0 : Number(customMin);
    const max = customMax === "" ? Infinity : Number(customMax);
    if (!Number.isFinite(min) || Number.isNaN(max) || min > max) return;
    const label =
      max === Infinity ? `A partir de ${formatKz(min)} Kz` : min === 0 ? `Até ${formatKz(max)} Kz` : `${formatKz(min)} – ${formatKz(max)} Kz`;
    setPriceRange({ key: "custom", min, max, label });
  };

  const rowClass = (active) =>
    `w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors ${
      active ? "bg-secondary text-foreground font-semibold" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
    }`;
  const countBadge = (n) => <span className="text-[11px] tabular-nums text-muted-foreground">{n}</span>;
  const sectionTitle = (text) => (
    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{text}</h3>
  );

  const filterPanel = (
    <div className="space-y-6 text-sm">
      <div>
        {sectionTitle("Categorias")}
        <ul className="space-y-0.5">
          <li>
            <button type="button" onClick={() => chooseCategory(null)} className={rowClass(!category)}>
              <span>Todas</span>
              {countBadge(inStock.length)}
            </button>
          </li>
          {categories.map(([name, count]) => (
            <li key={name}>
              <button type="button" onClick={() => chooseCategory(name)} className={rowClass(category === name && !subcategory)}>
                <span className="truncate">{name}</span>
                {countBadge(count)}
              </button>
              {category === name && subcategories.length > 0 && (
                <ul className="ml-3 mt-0.5 space-y-0.5 border-l border-border pl-2">
                  {subcategories.map(([sub, subCount]) => (
                    <li key={sub}>
                      <button type="button" onClick={() => setSubcategory(sub === subcategory ? null : sub)} className={rowClass(subcategory === sub)}>
                        <span className="truncate">{sub}</span>
                        {countBadge(subCount)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div>
        {sectionTitle("Preço")}
        <ul className="space-y-0.5">
          {rangeCounts
            .filter((range) => range.count > 0 || (priceRange && priceRange.key === range.key))
            .map((range) => {
              const active = priceRange && priceRange.key === range.key;
              return (
                <li key={range.key}>
                  <button type="button" onClick={() => setPriceRange(active ? null : range)} className={rowClass(active)}>
                    <span>{range.label}</span>
                    {countBadge(range.count)}
                  </button>
                </li>
              );
            })}
        </ul>
        <div className="flex items-center gap-1.5 mt-2">
          <input type="number" inputMode="numeric" min="0" placeholder="Mín." value={customMin}
            onChange={(e) => setCustomMin(e.target.value)} aria-label="Preço mínimo em Kz"
            className="w-full min-w-0 rounded-lg border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
          <span className="text-muted-foreground">–</span>
          <input type="number" inputMode="numeric" min="0" placeholder="Máx." value={customMax}
            onChange={(e) => setCustomMax(e.target.value)} aria-label="Preço máximo em Kz"
            className="w-full min-w-0 rounded-lg border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
          <button type="button" onClick={applyCustomPrice}
            className="shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-secondary">
            OK
          </button>
        </div>
      </div>

      {(promoCount > 0 || newCount > 0 || onlyPromo || onlyNew) && (
        <div>
          {sectionTitle("Mostrar")}
          <div className="space-y-1">
            {(promoCount > 0 || onlyPromo) && (
              <label className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 cursor-pointer hover:bg-secondary/60">
                <span className="flex items-center gap-2">
                  <input type="checkbox" checked={onlyPromo} onChange={(e) => setOnlyPromo(e.target.checked)} className="h-3.5 w-3.5 accent-primary" />
                  <Icon.Tag className="h-3.5 w-3.5 text-destructive" /> Em promoção
                </span>
                {countBadge(promoCount)}
              </label>
            )}
            {(newCount > 0 || onlyNew) && (
              <label className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 cursor-pointer hover:bg-secondary/60">
                <span className="flex items-center gap-2">
                  <input type="checkbox" checked={onlyNew} onChange={(e) => setOnlyNew(e.target.checked)} className="h-3.5 w-3.5 accent-primary" />
                  <Icon.Sparkles className="h-3.5 w-3.5 text-success" /> Novidades ({NEW_FILTER_DAYS} dias)
                </span>
                {countBadge(newCount)}
              </label>
            )}
          </div>
        </div>
      )}

      {activeFilters > 0 && (
        <button type="button" onClick={clearFilters} className="text-xs font-medium text-primary hover:underline">
          Limpar todos os filtros
        </button>
      )}
    </div>
  );

  const chips = [
    category && { key: "cat", label: category, clear: () => chooseCategory(null) },
    subcategory && { key: "sub", label: subcategory, clear: () => setSubcategory(null) },
    priceRange && { key: "price", label: priceRange.label, clear: () => setPriceRange(null) },
    onlyPromo && { key: "promo", label: "Em promoção", clear: () => setOnlyPromo(false) },
    onlyNew && { key: "new", label: "Novidades", clear: () => setOnlyNew(false) },
    search.trim() && { key: "q", label: `“${search.trim()}”`, clear: () => setSearch("") },
  ].filter(Boolean);

  const paymentIcons = {
    multicaixa_express: Icon.Smartphone, transfer: Icon.Building, cash_delivery: Icon.HandCoins,
    cash_pickup: Icon.Wallet, deposit: Icon.Banknote, qr_code: Icon.QrCode, other: Icon.CreditCard,
  };
  const paymentColors = {
    multicaixa_express: "text-orange-500 bg-orange-50", transfer: "text-blue-500 bg-blue-50",
    cash_delivery: "text-emerald-500 bg-emerald-50", cash_pickup: "text-purple-500 bg-purple-50",
    deposit: "text-cyan-500 bg-cyan-50", qr_code: "text-pink-500 bg-pink-50", other: "text-gray-500 bg-gray-50",
  };
  const activePayments = (store.paymentMethods || []).filter((method) => method.is_active);

  const listRow = (product) => {
    const pct = discountPct(product);
    const isNew = !product.badge && ageInDays(product) <= NEW_BADGE_DAYS;
    return (
      <Link key={product.id} to={`/produto/${product.slug}`}
        className="flex gap-4 p-3 rounded-xl border border-border bg-card hover:shadow-card-hover transition-all">
        <img src={productImgSrc(product.images && product.images[0])} alt={product.name} loading="lazy"
          className="h-24 w-24 shrink-0 rounded-lg object-cover bg-secondary" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] text-muted-foreground truncate">{product.category}</span>
            {isNew && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-success/10 text-success">Novo</span>}
            {pct > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">-{pct}%</span>}
          </div>
          <h3 className="text-sm font-medium line-clamp-2">{product.name}</h3>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-bold text-sm">{formatKz(product.price)} Kz</span>
            {pct > 0 && <span className="text-[10px] text-muted-foreground line-through">{formatKz(product.originalPrice)} Kz</span>}
          </div>
          {store.showStock && (
            <p className="text-[10px] text-muted-foreground mt-1">
              {product.stock <= 3 ? `Últimas ${product.stock} unidade${product.stock === 1 ? "" : "s"}` : `${product.stock} em stock`}
            </p>
          )}
        </div>
      </Link>
    );
  };

  return (
    <main id="topo-loja" className="min-h-screen bg-secondary/30 scroll-mt-20">
      <StoreSeoHead
        storeName={store.name}
        storeSlug={store.slug}
        storeDescription={store.description}
        storeLogo={store.logo}
        storeBanner={store.banner}
        province={store.province}
        city={store.city}
        phone={store.whatsapp}
        metaTitle={store.metaTitle}
        metaDescription={store.metaDescription}
        metaKeywords={store.metaKeywords}
      />

      {/* ─── Banner + identity ─── */}
      <div className="relative">
        <div className="h-48 sm:h-60 overflow-hidden">
          <img src={bannerSrc(store.banner)} alt={`Banner da loja ${store.name}`} className="w-full h-full object-cover" onError={onImgError("banner")} />
          <div className="absolute inset-0" style={{ background: theme.bannerGradient }} />
        </div>
        <div className="container relative -mt-24 z-10 pb-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <img src={logoSrc(store.logo, store.name)} alt={store.name}
              className="h-24 w-24 rounded-2xl border-4 border-card shadow-lg bg-card" onError={onImgError("logo", store.name)} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-extrabold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">{store.name}</h1>
                {store.isOfficial && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/90 text-white text-[10px] font-bold shadow-lg backdrop-blur-sm" title="Loja Oficial SuperLoja">
                    <Icon.CheckCircle className="h-3.5 w-3.5" /> Oficial
                  </span>
                )}
              </div>
              <p className="text-sm text-white/90 max-w-2xl line-clamp-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">{store.description}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-xs text-white/85 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
                <span className="flex items-center gap-1"><Icon.MapPin className="h-3.5 w-3.5" />{store.province}, {store.city}</span>
                <span className="flex items-center gap-1">
                  <Icon.Star className="h-3.5 w-3.5 fill-warning text-warning" />
                  {store.reviewCount > 0 ? `${store.rating} (${store.reviewCount} avaliações)` : "Sem avaliações ainda"}
                </span>
                {status && (
                  <span className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${status.open ? "bg-emerald-400" : "bg-red-400"}`} />
                    {status.text}
                  </span>
                )}
                <span className="flex items-center gap-1"><Icon.Package className="h-3.5 w-3.5" />{inStock.length} produtos disponíveis</span>
                {memberSince && <span className="flex items-center gap-1"><Icon.Calendar className="h-3.5 w-3.5" />Na SuperLoja desde {memberSince}</span>}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <a href={`https://wa.me/${(store.whatsapp || "").replace(/[^\d]/g, "")}`} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90 gap-1 rounded-xl text-xs h-8">
                    <Icon.MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </Button>
                </a>
                {phone && (
                  <a href={`tel:${phone.replace(/\s/g, "")}`}>
                    <Button variant="outline" size="sm" className="gap-1 rounded-xl text-xs h-8 bg-card/80 backdrop-blur border-border">
                      <Icon.Phone className="h-3.5 w-3.5" /> Ligar
                    </Button>
                  </a>
                )}
                {socials.instagram && (
                  <a href={socialUrl(socials.instagram, "https://instagram.com/")} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl bg-card/80 backdrop-blur border-border"><Icon.Instagram className="h-3.5 w-3.5" /></Button>
                  </a>
                )}
                {socials.facebook && (
                  <a href={socialUrl(socials.facebook, "https://facebook.com/")} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl bg-card/80 backdrop-blur border-border"><Icon.Facebook className="h-3.5 w-3.5" /></Button>
                  </a>
                )}
                {socials.tiktok && (
                  <a href={`https://tiktok.com/@${socials.tiktok}`} target="_blank" rel="noopener noreferrer" aria-label="TikTok">
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl bg-card/80 backdrop-blur border-border"><TikTokIcon className="h-3.5 w-3.5" /></Button>
                  </a>
                )}
                {socials.website && (
                  <a href={socials.website} target="_blank" rel="noopener noreferrer" aria-label="Website">
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl bg-card/80 backdrop-blur border-border"><Icon.Globe className="h-3.5 w-3.5" /></Button>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Store navigation ─── */}
      <div className="sticky top-16 z-40 bg-card border-b border-border">
        <div className="container">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide h-11 text-sm">
            <button onClick={() => chooseCategory(null)}
              className={`px-4 h-full shrink-0 font-medium transition-colors border-b-2 ${category ? "border-transparent text-muted-foreground hover:text-foreground" : theme.navActive}`}>
              Início
            </button>
            {categories.map(([name]) => (
              <button key={name} onClick={() => chooseCategory(name)}
                className={`px-4 h-full shrink-0 font-medium transition-colors border-b-2 ${category === name ? theme.navActive : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container py-6">
        {!category && <section className="mb-8"><StoreHeroSlider storeSlug={store.slug} /></section>}

        {!category && flashProducts.length > 0 && (
          <section className="mb-8">
            <div className={`rounded-2xl border ${theme.flashAccent} bg-card overflow-hidden`}>
              <div className={`flex items-center justify-between px-5 py-3 ${theme.accentBgLight} border-b ${theme.highlightBorder}`}>
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-destructive flex items-center justify-center">
                    <Icon.Zap className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                  <h3 className="font-bold text-sm">Flash Sale</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground font-medium mr-1">Termina em</span>
                  {[{ v: countdown.h, l: "h" }, { v: countdown.m, l: "m" }, { v: countdown.s, l: "s" }].map(({ v, l }) => (
                    <span key={l} className="bg-foreground text-background text-xs font-bold px-1.5 py-0.5 rounded-md min-w-[26px] text-center">
                      {String(v).padStart(2, "0")}{l}
                    </span>
                  ))}
                </div>
              </div>
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {flashProducts.map((product) => <ProductCard key={product.id} product={product} />)}
              </div>
            </div>
          </section>
        )}

        {!category && (
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              { icon: <Icon.Truck className={`h-5 w-5 ${theme.policyIconColor}`} />, title: "Entrega Rápida", desc: "2-5 dias úteis" },
              { icon: <Icon.ShieldCheck className={`h-5 w-5 ${theme.policyIconColor}`} />, title: "Garantia", desc: "Produtos originais" },
              { icon: <Icon.RotateCcw className={`h-5 w-5 ${theme.policyIconColor}`} />, title: "Devoluções", desc: "Até 7 dias" },
              { icon: <Icon.MessageCircle className={`h-5 w-5 ${theme.policyIconColor}`} />, title: "Suporte", desc: "WhatsApp 24h" },
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

        {/* ─── Products: filters + results ─── */}
        <section id="produtos" className="scroll-mt-20">
          <div className="flex flex-col lg:flex-row gap-6">
            <aside className="hidden lg:block w-60 shrink-0" aria-label="Filtros">
              <div className="sticky top-32 rounded-2xl border border-border bg-card p-4 max-h-[calc(100vh-9rem)] overflow-y-auto">
                <div className="flex items-center gap-2 mb-4 font-semibold">
                  <Icon.Sliders className="h-4 w-4" /> Filtros
                </div>
                {filterPanel}
              </div>
            </aside>

            <div className="flex-1 min-w-0">
              <div className="mb-4 space-y-3">
                <div>
                  <h2 className="text-lg font-bold">{subcategory || category || "Todos os produtos"}</h2>
                  <p className="text-xs text-muted-foreground">
                    {sorted.length === inStock.length
                      ? `${sorted.length} produto${sorted.length === 1 ? "" : "s"} disponíve${sorted.length === 1 ? "l" : "is"}`
                      : `${sorted.length} de ${inStock.length} produtos`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[180px] sm:max-w-xs">
                    <Icon.Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input type="search" placeholder="Buscar nesta loja..." value={search} onChange={(e) => setSearch(e.target.value)}
                      aria-label="Buscar nesta loja"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <button type="button" onClick={() => setFiltersOpen(true)}
                    className="lg:hidden inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium">
                    <Icon.Sliders className="h-3.5 w-3.5" /> Filtros
                    {activeFilters > 0 && <span className="ml-0.5 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{activeFilters}</span>}
                  </button>
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="hidden sm:inline">Ordenar por</span>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Ordenar produtos"
                      className="text-xs text-foreground border border-border rounded-lg px-3 py-2 bg-card focus:outline-none focus:ring-2 focus:ring-ring">
                      {SORTS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <div className="hidden sm:flex border border-border rounded-lg overflow-hidden ml-auto">
                    <button type="button" onClick={() => setViewGrid(true)} aria-label="Ver em grelha" aria-pressed={viewGrid}
                      className={`p-2 ${viewGrid ? theme.pillActive : "bg-card text-muted-foreground"}`}>
                      <Icon.Grid className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => setViewGrid(false)} aria-label="Ver em lista" aria-pressed={!viewGrid}
                      className={`p-2 ${viewGrid ? "bg-card text-muted-foreground" : theme.pillActive}`}>
                      <Icon.List className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {chips.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    {chips.map((chip) => (
                      <button key={chip.key} type="button" onClick={chip.clear}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs hover:bg-secondary"
                        aria-label={`Remover filtro ${chip.label}`}>
                        {chip.label} <Icon.X className="h-3 w-3" />
                      </button>
                    ))}
                    <button type="button" onClick={clearFilters} className="text-xs font-medium text-primary hover:underline">Limpar tudo</button>
                  </div>
                )}
              </div>

              {visible.length > 0 ? (
                viewGrid ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                    {visible.map((product) => <ProductCard key={product.id} product={withNewBadge(product)} />)}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">{visible.map(listRow)}</div>
                )
              ) : (
                <div className="rounded-2xl border border-border bg-card text-center py-14 px-4">
                  <Icon.Package className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="font-semibold">Nenhum produto encontrado</p>
                  <p className="text-sm text-muted-foreground mt-1">Tente outra pesquisa ou ajuste os filtros.</p>
                  {(activeFilters > 0 || search.trim()) && (
                    <button type="button" onClick={clearFilters} className="mt-4 rounded-xl border border-border px-4 py-2 text-xs font-medium hover:bg-secondary">
                      Limpar filtros
                    </button>
                  )}
                </div>
              )}

              {sorted.length > visibleCount && (
                <div className="text-center mt-6">
                  <p className="text-xs text-muted-foreground mb-2">A mostrar {visibleCount} de {sorted.length} produtos</p>
                  <button type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                    className="rounded-xl border border-border bg-card px-5 py-2 text-sm font-medium hover:bg-secondary">
                    Carregar mais produtos
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {activePayments.length > 0 && (
          <section className="mt-10">
            <h3 className="font-bold mb-3 flex items-center gap-2"><Icon.CreditCard className={`h-4 w-4 ${theme.accentText}`} /> Formas de Pagamento</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activePayments.map((method, index) => {
                const PayIcon = paymentIcons[method.type] || Icon.CreditCard;
                const [iconColor, iconBg] = (paymentColors[method.type] || "text-gray-500 bg-gray-50").split(" ");
                return (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border">
                    <div className={`h-9 w-9 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
                      <PayIcon className={`h-4 w-4 ${iconColor}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold">{method.label}</p>
                      {method.account && <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{method.account}</p>}
                      {method.details && <p className="text-[10px] text-muted-foreground mt-0.5">{method.details}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── About / contact / hours / reviews ─── */}
        <section id="contacto" className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-4 scroll-mt-20">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-bold mb-3 flex items-center gap-2"><Icon.Store className={`h-4 w-4 ${theme.accentText}`} /> Sobre a loja</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5 whitespace-pre-line">{store.description}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-sm text-muted-foreground">
              <p className="flex items-center gap-2"><Icon.MapPin className={`h-4 w-4 shrink-0 ${theme.accentText}`} /> {store.province}, {store.city}</p>
              {phone && (
                <a href={`tel:${phone.replace(/\s/g, "")}`} className="flex items-center gap-2 hover:text-foreground">
                  <Icon.Phone className={`h-4 w-4 shrink-0 ${theme.accentText}`} /> {phone}
                </a>
              )}
              {store.whatsapp && (
                <a href={`https://wa.me/${store.whatsapp.replace(/[^\d]/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-foreground">
                  <Icon.MessageCircle className={`h-4 w-4 shrink-0 ${theme.accentText}`} /> WhatsApp {store.whatsapp}
                </a>
              )}
              {store.email && (
                <a href={`mailto:${store.email}`} className="flex items-center gap-2 hover:text-foreground break-all">
                  <Icon.Mail className={`h-4 w-4 shrink-0 ${theme.accentText}`} /> {store.email}
                </a>
              )}
              {minOrder > 0 && (
                <p className="flex items-center gap-2"><Icon.Wallet className={`h-4 w-4 shrink-0 ${theme.accentText}`} /> Encomenda mínima: {formatKz(minOrder)} Kz</p>
              )}
              {memberSince && (
                <p className="flex items-center gap-2"><Icon.Calendar className={`h-4 w-4 shrink-0 ${theme.accentText}`} /> Na SuperLoja desde {memberSince}</p>
              )}
            </div>

            {Array.isArray(store.businessHours) && store.businessHours.length > 0 && (
              <div className="mt-5 pt-5 border-t border-border">
                <p className="text-xs font-semibold mb-2 flex items-center gap-2">
                  <Icon.Clock className={`h-3.5 w-3.5 ${theme.accentText}`} /> Horário de funcionamento
                  {status && <span className={`ml-1 text-[10px] font-semibold ${status.open ? "text-emerald-600" : "text-red-500"}`}>{status.open ? "Aberto agora" : "Fechado agora"}</span>}
                </p>
                <ul className="text-xs divide-y divide-border">
                  {WEEK.map((day) => {
                    const entry = hoursFor(store.businessHours, day);
                    const isToday = day === todayName;
                    return (
                      <li key={day} className={`flex items-center justify-between py-1.5 ${isToday ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                        <span>{DAY_LABEL[day]}{isToday ? " (hoje)" : ""}</span>
                        <span className="tabular-nums">{entry && entry.active && entry.open ? `${entry.open} – ${entry.close}` : "Fechado"}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {(socials.instagram || socials.facebook || socials.tiktok || socials.website) && (
              <div className="mt-5 pt-5 border-t border-border">
                <p className="text-xs font-semibold mb-2">Redes sociais</p>
                <div className="flex flex-wrap gap-2">
                  {socials.instagram && (
                    <a href={socialUrl(socials.instagram, "https://instagram.com/")} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs hover:bg-accent transition-colors">
                      <Icon.Instagram className="h-3.5 w-3.5" /> @{String(socials.instagram).replace(/^.*instagram\.com\//, "").replace(/^@/, "").replace(/\/$/, "")}
                    </a>
                  )}
                  {socials.facebook && (
                    <a href={socialUrl(socials.facebook, "https://facebook.com/")} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs hover:bg-accent transition-colors">
                      <Icon.Facebook className="h-3.5 w-3.5" /> Facebook
                    </a>
                  )}
                  {socials.tiktok && (
                    <a href={socialUrl(socials.tiktok, "https://tiktok.com/", "@")} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs hover:bg-accent transition-colors">
                      <TikTokIcon className="h-3.5 w-3.5" /> TikTok
                    </a>
                  )}
                  {socials.website && (
                    <a href={socials.website} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs hover:bg-accent transition-colors">
                      <Icon.Globe className="h-3.5 w-3.5" /> Website
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <ReviewSection type="store" targetId={store.id} targetName={store.name} averageRating={store.rating} totalReviews={store.reviewCount} />
          </div>
        </section>
      </div>

      {/* ─── Mobile filters drawer ─── */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label="Filtros">
          <div className="absolute inset-0 bg-black/40" onClick={() => setFiltersOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-[86%] max-w-sm flex-col bg-card shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <span className="flex items-center gap-2 font-semibold"><Icon.Sliders className="h-4 w-4" /> Filtros</span>
              <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Fechar filtros" className="rounded-lg p-1.5 hover:bg-secondary">
                <Icon.X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">{filterPanel}</div>
            <div className="flex gap-2 border-t border-border p-4">
              <button type="button" onClick={clearFilters} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium">Limpar</button>
              <button type="button" onClick={() => setFiltersOpen(false)} className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground">
                Ver {sorted.length} produto{sorted.length === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
