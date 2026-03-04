import { useState, useEffect, useMemo } from "react";
import { Zap, Search, ChevronDown, SlidersHorizontal, X, Grid3X3, List } from "lucide-react";
import { useFlashSaleProducts } from "@/hooks/useApi";
import { ProductCard } from "@/components/ProductCard";
import { motion } from "framer-motion";

function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(targetDate));
  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(getTimeLeft(targetDate)), 1000);
    return () => clearInterval(timer);
  }, [targetDate]);
  return timeLeft;
}

function getTimeLeft(target: Date) {
  const diff = Math.max(0, target.getTime() - Date.now());
  return {
    hours: Math.floor(diff / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

const FlashSale = () => {
  const [sortBy, setSortBy] = useState<"discount" | "price-asc" | "price-desc" | "rating">("discount");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [search, setSearch] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [viewGrid, setViewGrid] = useState(true);

  const { data: allPromo = [] } = useFlashSaleProducts();

  // Use the nearest flash_sale_end from products, fallback to end of day
  const targetDate = useMemo(() => {
    const ends = allPromo
      .filter(p => p.flashSaleEnd)
      .map(p => new Date(p.flashSaleEnd!).getTime())
      .filter(t => t > Date.now())
      .sort((a, b) => a - b);
    if (ends.length > 0) return new Date(ends[0]);
    const d = new Date(); d.setHours(23, 59, 59, 999); return d;
  }, [allPromo]);
  const { hours, minutes, seconds } = useCountdown(targetDate);

  const categories = useMemo(() => [...new Set(allPromo.map((p) => p.category))].sort(), [allPromo]);

  const priceRange = useMemo(() => {
    if (allPromo.length === 0) return { min: 0, max: 0 };
    return { min: Math.min(...allPromo.map(p => p.price)), max: Math.max(...allPromo.map(p => p.price)) };
  }, [allPromo]);

  const sorted = useMemo(() => {
    let filtered = [...allPromo];

    if (selectedCategory) filtered = filtered.filter((p) => p.category === selectedCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(q) || p.store.name.toLowerCase().includes(q));
    }
    if (minPrice) filtered = filtered.filter((p) => p.price >= parseFloat(minPrice));
    if (maxPrice) filtered = filtered.filter((p) => p.price <= parseFloat(maxPrice));

    return filtered.sort((a, b) => {
      if (sortBy === "discount") {
        const dA = a.originalPrice ? (a.originalPrice - a.price) / a.originalPrice : 0;
        const dB = b.originalPrice ? (b.originalPrice - b.price) / b.originalPrice : 0;
        return dB - dA;
      }
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      if (sortBy === "rating") return b.rating - a.rating;
      return 0;
    });
  }, [allPromo, selectedCategory, search, minPrice, maxPrice, sortBy]);

  const activeFilterCount = [selectedCategory, search, minPrice, maxPrice].filter(Boolean).length;

  const clearFilters = () => {
    setSelectedCategory(""); setSearch(""); setMinPrice(""); setMaxPrice("");
  };

  const formatPrice = (val: number) => new Intl.NumberFormat("pt-AO").format(val);

  return (
    <main className="min-h-screen bg-secondary/30">
      {/* Hero */}
      <div className="bg-gradient-to-r from-destructive to-primary py-10 sm:py-14">
        <div className="container text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-12 w-12 rounded-2xl bg-card/20 backdrop-blur flex items-center justify-center">
              <Zap className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-primary-foreground">Ofertas Relâmpago</h1>
          </div>
          <p className="text-primary-foreground/80 text-sm mb-6 max-w-md mx-auto">
            Descontos imperdíveis por tempo limitado! Aproveite antes que acabe.
          </p>
          {/* Countdown */}
          <div className="flex items-center justify-center gap-3">
            <span className="text-primary-foreground/70 text-sm font-medium">Termina em</span>
            {[
              { value: hours, label: "Horas" },
              { value: minutes, label: "Min" },
              { value: seconds, label: "Seg" },
            ].map(({ value, label }) => (
              <div key={label} className="flex flex-col items-center">
                <span className="bg-card text-foreground text-xl font-bold px-3 py-2 rounded-xl min-w-[52px] text-center shadow-md">
                  {String(value).padStart(2, "0")}
                </span>
                <span className="text-[10px] text-primary-foreground/70 mt-1">{label}</span>
              </div>
            ))}
          </div>
          {/* Search bar in hero */}
          <div className="max-w-xl mx-auto mt-6 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Pesquisar ofertas por nome ou loja..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border-0 bg-card pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring shadow-lg placeholder:text-muted-foreground"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="container py-6">
        {/* Filter bar */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Category pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setSelectedCategory("")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!selectedCategory ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}
              >
                Todas ({allPromo.length})
              </button>
              {categories.map((cat) => {
                const count = allPromo.filter(p => p.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(selectedCategory === cat ? "" : cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedCategory === cat ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>

            {/* Sort + filters toggle + view */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${showFilters ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filtros
                {activeFilterCount > 0 && (
                  <span className="h-4 w-4 rounded-full bg-destructive text-[9px] font-bold text-white flex items-center justify-center">{activeFilterCount}</span>
                )}
              </button>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="appearance-none text-xs border border-border rounded-xl px-4 py-2 pr-8 bg-card focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="discount">Maior Desconto</option>
                  <option value="price-asc">Menor Preço</option>
                  <option value="price-desc">Maior Preço</option>
                  <option value="rating">Melhor Avaliação</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>
              <div className="hidden sm:flex border border-border rounded-lg overflow-hidden">
                <button onClick={() => setViewGrid(true)}
                  className={`p-1.5 ${viewGrid ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>
                  <Grid3X3 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setViewGrid(false)}
                  className={`p-1.5 ${!viewGrid ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Expandable filter panel */}
          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                <div className="flex-1 w-full">
                  <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Faixa de Preço (Kz)</label>
                  <div className="flex items-center gap-2">
                    <input type="number" placeholder={`Min (${formatPrice(priceRange.min)})`} value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="flex-1 text-xs border border-border rounded-lg px-3 py-2 bg-card focus:outline-none focus:ring-2 focus:ring-ring" />
                    <span className="text-muted-foreground text-xs">—</span>
                    <input type="number" placeholder={`Max (${formatPrice(priceRange.max)})`} value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="flex-1 text-xs border border-border rounded-lg px-3 py-2 bg-card focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                </div>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="text-xs text-destructive hover:underline font-medium shrink-0 pb-0.5">
                    Limpar filtros
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Results count */}
        <p className="text-xs text-muted-foreground mb-4">
          {sorted.length} produto{sorted.length !== 1 ? "s" : ""} em promoção
          {activeFilterCount > 0 && <span className="text-primary font-medium"> (filtrado)</span>}
        </p>

        {/* Products */}
        <div className={viewGrid ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"}>
          {sorted.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </div>

        {sorted.length === 0 && (
          <div className="text-center py-16">
            <Zap className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Nenhuma oferta encontrada.</p>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="text-sm text-primary hover:underline mt-2">Limpar filtros</button>
            )}
          </div>
        )}
      </div>
    </main>
  );
};

export default FlashSale;
