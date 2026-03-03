import { useStores } from "@/hooks/useApi";
import { StoreCard } from "@/components/StoreCard";
import { Search, MapPin, Star, SlidersHorizontal, Grid3X3, List, Store, ChevronDown } from "lucide-react";
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { logoSrc, bannerSrc, onImgError } from "@/lib/imageHelpers";

const Stores = () => {
  const [search, setSearch] = useState("");
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [sortBy, setSortBy] = useState<"name" | "rating" | "reviews">("rating");
  const [viewGrid, setViewGrid] = useState(true);
  const { data: allStores = [] } = useStores();

  let filtered = allStores.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.description.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedProvince) {
    filtered = filtered.filter((s) => s.province === selectedProvince);
  }

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "rating") return b.rating - a.rating;
    if (sortBy === "reviews") return b.reviewCount - a.reviewCount;
    return 0;
  });

  const storeProvinces = [...new Set(allStores.map((s) => s.province))];

  return (
    <main className="min-h-screen bg-secondary/30">
      {/* Hero */}
      <div className="bg-hero-gradient py-10 sm:py-14">
        <div className="container text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-10 w-10 rounded-xl bg-card/20 backdrop-blur flex items-center justify-center">
              <Store className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-primary-foreground">Explorar Lojas</h1>
          </div>
          <p className="text-primary-foreground/80 text-sm mb-6 max-w-md mx-auto">
            Descubra as melhores lojas de Angola. Encontre a loja perfeita por nome, província ou categoria.
          </p>
          {/* Search */}
          <div className="max-w-2xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Pesquisar lojas por nome ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border-0 bg-card pl-12 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring shadow-lg placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>

      <div className="container py-6">
        {/* Filters row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            {/* Province filter */}
            <div className="relative">
              <select
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
                className="appearance-none text-xs border border-border rounded-xl px-4 py-2 pr-8 bg-card focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Todas Províncias</option>
                {storeProvinces.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>

            {/* Province pills */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setSelectedProvince("")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-colors ${!selectedProvince ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}
              >
                Todas
              </button>
              {storeProvinces.map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedProvince(selectedProvince === p ? "" : p)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-colors flex items-center gap-1 ${selectedProvince === p ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}
                >
                  <MapPin className="h-3 w-3" /> {p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="text-xs border border-border rounded-xl px-3 py-2 bg-card focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="rating">Melhor Avaliação</option>
              <option value="reviews">Mais Avaliadas</option>
              <option value="name">Nome A-Z</option>
            </select>
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

        {/* Results count */}
        <p className="text-xs text-muted-foreground mb-4">
          {sorted.length} loja{sorted.length !== 1 ? "s" : ""} encontrada{sorted.length !== 1 ? "s" : ""}
          {selectedProvince && ` em ${selectedProvince}`}
        </p>

        {/* Stores grid/list */}
        {viewGrid ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map((store, i) => (
              <motion.div
                key={store.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <Link
                  to={`/lojas/${store.slug}`}
                  className="group flex flex-col rounded-xl border border-border bg-card overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 h-full"
                >
                  {/* Banner */}
                  <div className="h-36 overflow-hidden relative flex-shrink-0">
                    <img src={bannerSrc(store.banner)} alt={store.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={onImgError("banner")} />
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 to-transparent" />
                    <div className="absolute bottom-2 right-2 flex gap-1">
                      {store.categories.slice(0, 2).map((cat) => (
                        <span key={cat} className="px-2 py-0.5 rounded-md bg-card/80 backdrop-blur text-[10px] font-medium">{cat}</span>
                      ))}
                    </div>
                  </div>
                  {/* Info */}
                  <div className="p-4 flex flex-col flex-1 relative z-10">
                    <div className="flex items-start gap-3">
                      <img src={logoSrc(store.logo, store.name)} alt={store.name} className="h-12 w-12 rounded-xl -mt-8 border-2 border-card shadow-md bg-card flex-shrink-0" onError={onImgError("logo", store.name)} />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm truncate group-hover:text-primary transition-colors">{store.name}</h3>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <MapPin className="h-3 w-3 flex-shrink-0" /> {store.province}, {store.city}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-2 flex-1">{store.description}</p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                        <span className="text-xs font-semibold">{store.rating}</span>
                        <span className="text-[11px] text-muted-foreground">({store.reviewCount})</span>
                      </div>
                      <span className="text-xs font-semibold text-primary group-hover:underline">Ver loja →</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sorted.map((store) => (
              <Link
                key={store.id}
                to={`/lojas/${store.slug}`}
                className="flex gap-4 p-4 rounded-xl border border-border bg-card hover:shadow-card-hover transition-all group"
              >
                <img src={logoSrc(store.logo, store.name)} alt={store.name} className="h-16 w-16 rounded-xl bg-card" onError={onImgError("logo", store.name)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm group-hover:text-primary transition-colors">{store.name}</h3>
                    <div className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-warning text-warning" />
                      <span className="text-xs font-medium">{store.rating}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{store.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {store.province}</span>
                    <span>{store.reviewCount} avaliações</span>
                    <span>{store.categories.length} categorias</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {sorted.length === 0 && (
          <div className="text-center py-16">
            <Store className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Nenhuma loja encontrada.</p>
            <p className="text-xs text-muted-foreground mt-1">Tente alterar os filtros de pesquisa.</p>
          </div>
        )}
      </div>
    </main>
  );
};

export default Stores;
