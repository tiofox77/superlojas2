import { useParams, Link } from "react-router-dom";
import { useState, useMemo } from "react";
import { useCategories, useProducts } from "@/hooks/useApi";
import { ProductCard } from "@/components/ProductCard";
import { motion } from "framer-motion";
import { ChevronDown, Grid3X3, List, ArrowLeft, Search, SlidersHorizontal, X, Tag } from "lucide-react";

const CategoryDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [sortBy, setSortBy] = useState<"relevance" | "price-asc" | "price-desc" | "rating" | "newest">("relevance");
  const [viewGrid, setViewGrid] = useState(true);
  const [search, setSearch] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedBadge, setSelectedBadge] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data: allCategories = [] } = useCategories();
  const category = allCategories.find((c) => c.slug === slug);

  const { data: products = [] } = useProducts(category ? { category: category.name } : undefined);

  const badges = useMemo(() => [...new Set(products.map(p => p.badge).filter(Boolean))], [products]);

  const priceRange = useMemo(() => {
    if (products.length === 0) return { min: 0, max: 0 };
    return { min: Math.min(...products.map(p => p.price)), max: Math.max(...products.map(p => p.price)) };
  }, [products]);

  const sorted = useMemo(() => {
    let filtered = [...products];

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(q) || p.store.name.toLowerCase().includes(q));
    }
    if (minPrice) filtered = filtered.filter((p) => p.price >= parseFloat(minPrice));
    if (maxPrice) filtered = filtered.filter((p) => p.price <= parseFloat(maxPrice));
    if (selectedBadge) filtered = filtered.filter((p) => p.badge === selectedBadge);

    return filtered.sort((a, b) => {
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "newest") return Number(b.id) - Number(a.id);
      return 0;
    });
  }, [products, search, minPrice, maxPrice, selectedBadge, sortBy]);

  const activeFilterCount = [search, minPrice, maxPrice, selectedBadge].filter(Boolean).length;

  const clearFilters = () => {
    setSearch(""); setMinPrice(""); setMaxPrice(""); setSelectedBadge("");
  };

  const formatPrice = (val: number) => new Intl.NumberFormat("pt-AO").format(val);

  if (!category) {
    return (
      <main className="min-h-screen bg-secondary/30 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground font-medium text-lg">Categoria não encontrada</p>
          <Link to="/categorias" className="text-primary text-sm hover:underline mt-2 inline-block">
            ← Voltar às categorias
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-secondary/30">
      {/* Hero */}
      <div className="bg-hero-gradient py-8 sm:py-12">
        <div className="container">
          <Link to="/categorias" className="inline-flex items-center gap-1 text-primary-foreground/70 text-xs hover:text-primary-foreground mb-3 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Todas Categorias
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-4xl">{category.icon}</span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-primary-foreground">{category.name}</h1>
              <p className="text-primary-foreground/80 text-sm">{category.productCount} produtos disponíveis</p>
            </div>
          </div>
          {/* Search bar */}
          <div className="max-w-xl mt-5 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={`Pesquisar em ${category.name}...`}
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
        {/* Filters row */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Badge pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setSelectedBadge("")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!selectedBadge ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}
              >
                Todos ({products.length})
              </button>
              {badges.map((badge) => {
                const count = products.filter(p => p.badge === badge).length;
                return (
                  <button
                    key={badge}
                    onClick={() => setSelectedBadge(selectedBadge === badge ? "" : badge)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${selectedBadge === badge ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}
                  >
                    <Tag className="h-3 w-3" /> {badge} ({count})
                  </button>
                );
              })}
            </div>

            {/* Sort + filters + view */}
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
                  <option value="relevance">Relevância</option>
                  <option value="newest">Mais Recentes</option>
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
          {sorted.length} produto{sorted.length !== 1 ? "s" : ""} encontrado{sorted.length !== 1 ? "s" : ""}
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
            <span className="text-5xl mb-3 block">{category.icon}</span>
            <p className="text-muted-foreground font-medium">Nenhum produto encontrado nesta categoria.</p>
            {activeFilterCount > 0 ? (
              <button onClick={clearFilters} className="text-sm text-primary hover:underline mt-2">Limpar filtros</button>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">Novos produtos serão adicionados em breve.</p>
            )}
          </div>
        )}
      </div>
    </main>
  );
};

export default CategoryDetail;
