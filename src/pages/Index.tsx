import { HeroSlider } from "@/components/HeroSlider";
import { HotCategories } from "@/components/HotCategories";
import { FeaturedCategories } from "@/components/FeaturedCategories";
import { StoreCard } from "@/components/StoreCard";
import { ProductCard } from "@/components/ProductCard";
import { FlashDeals } from "@/components/FlashDeals";
import { useFeaturedStores, useTrendingProducts } from "@/hooks/useApi";
import { motion } from "framer-motion";
import { ArrowRight, TrendingUp, Store } from "lucide-react";
import { Link } from "react-router-dom";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const Index = () => {
  const { data: featuredStores = [] } = useFeaturedStores();
  const { data: trendingProducts = [] } = useTrendingProducts();

  return (
    <main className="min-h-screen bg-secondary/30">
      {/* Hero: Slider + Hot Categories side by side */}
      <section className="container pt-4 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
          <HeroSlider />
          <div className="hidden lg:block">
            <HotCategories />
          </div>
        </div>
      </section>

      {/* Featured Categories Carousel */}
      <motion.section className="container" {...fadeUp}>
        <FeaturedCategories />
      </motion.section>

      {/* Flash Deals */}
      <motion.section className="container mt-8" {...fadeUp} transition={{ duration: 0.5, delay: 0.1 }}>
        <FlashDeals />
      </motion.section>

      {/* Featured Stores */}
      <motion.section className="container mt-10" {...fadeUp} transition={{ duration: 0.5, delay: 0.15 }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Store className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Lojas em Destaque</h2>
              <p className="text-xs text-muted-foreground">As melhores lojas verificadas</p>
            </div>
          </div>
          <Link to="/lojas" className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            Ver todas <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {featuredStores.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>
      </motion.section>

      {/* Trending Products */}
      <motion.section className="container mt-10 pb-10" {...fadeUp} transition={{ duration: 0.5, delay: 0.2 }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-warning" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Produtos em Alta</h2>
              <p className="text-xs text-muted-foreground">Os mais procurados pelos clientes</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {trendingProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </motion.section>

      {/* CTA Banner */}
      <section className="container pb-10">
        <div className="rounded-2xl bg-hero-gradient p-8 sm:p-12 text-primary-foreground text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDJ2LTJoMzR6bTAtNHYySDJ2LTJoMzR6bTAtNHYySDJ2LTJoMzR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-40" />
          <div className="relative z-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">🏪 Abra sua loja no SuperLojas</h2>
            <p className="text-primary-foreground/80 mb-6 max-w-md mx-auto text-sm">Milhares de clientes esperando. Cadastre sua loja gratuitamente e comece a vender hoje.</p>
            <Link
              to="/cadastro-loja"
              className="inline-block rounded-xl bg-card text-foreground px-8 py-3 font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg"
            >
              Começar Agora — É Grátis
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Index;
