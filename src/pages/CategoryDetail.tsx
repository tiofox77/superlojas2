import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { useCategories, useProducts } from "@/hooks/useApi";
import { ProductCard } from "@/components/ProductCard";
import { motion } from "framer-motion";
import { ChevronDown, Grid3X3, List, ArrowLeft } from "lucide-react";

const CategoryDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [sortBy, setSortBy] = useState<"relevance" | "price-asc" | "price-desc" | "rating">("relevance");
  const [viewGrid, setViewGrid] = useState(true);

  const { data: allCategories = [] } = useCategories();
  const category = allCategories.find((c) => c.slug === slug);

  const { data: products = [] } = useProducts(category ? { category: category.name } : undefined);

  const sorted = [...products].sort((a, b) => {
    if (sortBy === "price-asc") return a.price - b.price;
    if (sortBy === "price-desc") return b.price - a.price;
    if (sortBy === "rating") return b.rating - a.rating;
    return 0;
  });

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
        </div>
      </div>

      <div className="container py-6">
        {/* Filters */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <p className="text-xs text-muted-foreground">
            {sorted.length} produto{sorted.length !== 1 ? "s" : ""} encontrado{sorted.length !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="appearance-none text-xs border border-border rounded-xl px-4 py-2 pr-8 bg-card focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="relevance">Relevância</option>
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
            <p className="text-xs text-muted-foreground mt-1">Novos produtos serão adicionados em breve.</p>
          </div>
        )}
      </div>
    </main>
  );
};

export default CategoryDetail;
