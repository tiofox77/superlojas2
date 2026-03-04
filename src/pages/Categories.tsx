import { Link } from "react-router-dom";
import { useState, useMemo } from "react";
import { useCategories } from "@/hooks/useApi";
import { motion } from "framer-motion";
import { Grid3X3, Search, X, ChevronDown } from "lucide-react";

const COLORS = [
  "from-orange-500/10 to-amber-500/10 border-orange-200/50 dark:border-orange-800/30",
  "from-blue-500/10 to-cyan-500/10 border-blue-200/50 dark:border-blue-800/30",
  "from-emerald-500/10 to-teal-500/10 border-emerald-200/50 dark:border-emerald-800/30",
  "from-purple-500/10 to-pink-500/10 border-purple-200/50 dark:border-purple-800/30",
  "from-rose-500/10 to-red-500/10 border-rose-200/50 dark:border-rose-800/30",
  "from-cyan-500/10 to-sky-500/10 border-cyan-200/50 dark:border-cyan-800/30",
  "from-amber-500/10 to-yellow-500/10 border-amber-200/50 dark:border-amber-800/30",
  "from-indigo-500/10 to-violet-500/10 border-indigo-200/50 dark:border-indigo-800/30",
  "from-lime-500/10 to-green-500/10 border-lime-200/50 dark:border-lime-800/30",
  "from-fuchsia-500/10 to-pink-500/10 border-fuchsia-200/50 dark:border-fuchsia-800/30",
];

const Categories = () => {
  const { data: globalCategories = [] } = useCategories();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"default" | "name" | "products">("default");

  const filtered = useMemo(() => {
    let cats = [...globalCategories];

    if (search.trim()) {
      const q = search.toLowerCase();
      cats = cats.filter((c) => c.name.toLowerCase().includes(q));
    }

    if (sortBy === "name") cats.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "products") cats.sort((a, b) => b.productCount - a.productCount);

    return cats;
  }, [globalCategories, search, sortBy]);

  return (
    <main className="min-h-screen bg-secondary/30">
      <div className="bg-hero-gradient py-10 sm:py-14">
        <div className="container text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-10 w-10 rounded-xl bg-card/20 backdrop-blur flex items-center justify-center">
              <Grid3X3 className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-primary-foreground">Todas as Categorias</h1>
          </div>
          <p className="text-primary-foreground/80 text-sm max-w-md mx-auto">
            Explore todas as categorias disponíveis no SuperLojas
          </p>
          {/* Search */}
          <div className="max-w-xl mx-auto mt-6 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Pesquisar categorias..."
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

      <div className="container py-8">
        {/* Sort + count */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-xs text-muted-foreground">
            {filtered.length} categoria{filtered.length !== 1 ? "s" : ""}
            {search && <span className="text-primary font-medium"> (filtrado)</span>}
          </p>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="appearance-none text-xs border border-border rounded-xl px-4 py-2 pr-8 bg-card focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="default">Ordem padrão</option>
              <option value="name">Nome A-Z</option>
              <option value="products">Mais Produtos</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((cat, i) => {
            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <Link
                  to={`/categoria/${cat.slug}`}
                  className="group block rounded-2xl border border-border bg-card overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300"
                >
                  <div className={`aspect-[4/3] overflow-hidden relative bg-gradient-to-br ${COLORS[i % COLORS.length]} flex items-center justify-center`}>
                    <span className="text-7xl group-hover:scale-110 transition-transform duration-300 drop-shadow-sm">
                      {cat.icon || "📦"}
                    </span>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent pt-8 pb-3 px-3">
                      <h3 className="text-white font-bold text-sm drop-shadow-md">{cat.name}</h3>
                      <p className="text-white/80 text-[11px]">{cat.productCount} produtos</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Grid3X3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Nenhuma categoria encontrada.</p>
            {search && (
              <button onClick={() => setSearch("")} className="text-sm text-primary hover:underline mt-2">Limpar pesquisa</button>
            )}
          </div>
        )}
      </div>
    </main>
  );
};

export default Categories;
