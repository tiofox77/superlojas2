import { useState, useEffect } from "react";
import { Zap, SlidersHorizontal, ChevronDown } from "lucide-react";
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
  const [sortBy, setSortBy] = useState<"discount" | "price-asc" | "price-desc">("discount");
  const [selectedCategory, setSelectedCategory] = useState("");

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  const { hours, minutes, seconds } = useCountdown(endOfDay);

  const { data: allPromo = [] } = useFlashSaleProducts();
  let promoProducts = allPromo;

  if (selectedCategory) {
    promoProducts = promoProducts.filter((p) => p.category === selectedCategory);
  }

  const sorted = [...promoProducts].sort((a, b) => {
    if (sortBy === "discount") {
      const dA = a.originalPrice ? (a.originalPrice - a.price) / a.originalPrice : 0;
      const dB = b.originalPrice ? (b.originalPrice - b.price) / b.originalPrice : 0;
      return dB - dA;
    }
    if (sortBy === "price-asc") return a.price - b.price;
    return b.price - a.price;
  });

  const categories = [...new Set(promoProducts.map((p) => p.category))];

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
        </div>
      </div>

      <div className="container py-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedCategory("")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!selectedCategory ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}
            >
              Todas
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? "" : cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedCategory === cat ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="appearance-none text-xs border border-border rounded-xl px-4 py-2 pr-8 bg-card focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="discount">Maior Desconto</option>
              <option value="price-asc">Menor Preço</option>
              <option value="price-desc">Maior Preço</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          {sorted.length} produto{sorted.length !== 1 ? "s" : ""} em promoção
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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
          </div>
        )}
      </div>
    </main>
  );
};

export default FlashSale;
