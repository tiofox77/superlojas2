import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { useProducts } from "@/hooks/useApi";
import { ProductCard } from "@/components/ProductCard";
import { Search, X, SlidersHorizontal, Package, Loader2 } from "lucide-react";

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const q = searchParams.get("q") || "";
  const [input, setInput] = useState(q);
  const [sortBy, setSortBy] = useState<"relevance" | "price-asc" | "price-desc" | "rating" | "newest">("relevance");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedBadge, setSelectedBadge] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Keep input in sync if URL changes
  useEffect(() => { setInput(q); }, [q]);

  // Build API params based on current query
  const apiParams = useMemo(() => {
    if (!q.trim()) return undefined;
    const p: Record<string, string> = { search: q.trim(), per_page: "48" };
    if (minPrice) p.min_price = minPrice;
    if (maxPrice) p.max_price = maxPrice;
    if (selectedBadge) p.badge = selectedBadge;
    if (inStockOnly) p.in_stock = "1";
    return p;
  }, [q, minPrice, maxPrice, selectedBadge, inStockOnly]);

  const { data: products = [], isLoading } = useProducts(apiParams);

  const sorted = useMemo(() => {
    const list = [...products];
    return list.sort((a, b) => {
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "newest") return Number(b.id) - Number(a.id);
      return 0;
    });
  }, [products, sortBy]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = input.trim();
    if (!term) return;
    setSearchParams({ q: term });
  };

  const clearFilters = () => {
    setMinPrice(""); setMaxPrice(""); setSelectedBadge(""); setInStockOnly(false);
  };

  const activeFilterCount = [minPrice, maxPrice, selectedBadge, inStockOnly ? "1" : ""].filter(Boolean).length;

  // Derive unique stores & badges from results
  const uniqueStores = useMemo(() => {
    const m = new Map<string, { slug: string; name: string; count: number }>();
    products.forEach(p => {
      const k = p.store.slug;
      const prev = m.get(k);
      if (prev) prev.count++;
      else m.set(k, { slug: p.store.slug, name: p.store.name, count: 1 });
    });
    return [...m.values()].sort((a, b) => b.count - a.count).slice(0, 8);
  }, [products]);

  return (
    <div className="container py-6 sm:py-10 min-h-[70vh]">
      {/* Search bar */}
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pesquisar produtos em todas as lojas..."
            autoFocus
            className="w-full rounded-2xl border border-border bg-card pl-12 pr-32 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary shadow-sm"
          />
          {input && (
            <button type="button" onClick={() => setInput("")} className="absolute right-24 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
          <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
            Buscar
          </button>
        </div>
      </form>

      {/* Results header */}
      {q && (
        <div className="max-w-6xl mx-auto mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">
                {isLoading ? "A pesquisar..." : `${products.length} resultado${products.length !== 1 ? "s" : ""}`}
              </h1>
              <p className="text-sm text-muted-foreground">
                para <span className="font-semibold text-foreground">"{q}"</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${showFilters || activeFilterCount > 0 ? "bg-primary/10 text-primary border-primary/30" : "bg-card border-border hover:bg-secondary"}`}>
                <SlidersHorizontal className="h-3.5 w-3.5" /> Filtros
                {activeFilterCount > 0 && <span className="h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">{activeFilterCount}</span>}
              </button>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-3 py-2 rounded-xl border border-border bg-card text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="relevance">Relevância</option>
                <option value="price-asc">Preço: menor primeiro</option>
                <option value="price-desc">Preço: maior primeiro</option>
                <option value="rating">Melhor avaliados</option>
                <option value="newest">Mais recentes</option>
              </select>
            </div>
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div className="mt-4 p-4 rounded-2xl border border-border bg-card">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Preço Min (Kz)</label>
                  <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="0"
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Preço Max (Kz)</label>
                  <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="999999"
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Estado</label>
                  <select value={selectedBadge} onChange={(e) => setSelectedBadge(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">Todos</option>
                    <option value="Novo">Novo</option>
                    <option value="Usado">Usado</option>
                    <option value="Promo">Promoção</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none">
                    <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)}
                      className="h-4 w-4 rounded accent-primary" />
                    Apenas em stock
                  </label>
                </div>
              </div>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="mt-3 text-xs font-medium text-destructive hover:underline">
                  Limpar filtros
                </button>
              )}
            </div>
          )}

          {/* Top stores chips */}
          {uniqueStores.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-xs font-semibold text-muted-foreground py-1.5">Lojas:</span>
              {uniqueStores.map(s => (
                <Link key={s.slug} to={`/lojas/${s.slug}`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary text-xs font-medium hover:bg-primary/10 hover:text-primary transition-colors">
                  {s.name} <span className="text-muted-foreground">({s.count})</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      <div className="max-w-6xl mx-auto">
        {!q ? (
          <div className="text-center py-20">
            <Search className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">O que procura hoje?</h2>
            <p className="text-sm text-muted-foreground">Pesquise produtos em todas as lojas do SuperLoja.</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-dashed border-border">
            <Package className="h-14 w-14 text-muted-foreground/30 mx-auto mb-3" />
            <h2 className="text-lg font-semibold mb-1">Nenhum produto encontrado</h2>
            <p className="text-sm text-muted-foreground mb-4">Não encontramos produtos para "{q}". Tente outros termos.</p>
            <button onClick={() => navigate("/categorias")} className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90">
              Ver categorias
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {sorted.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
