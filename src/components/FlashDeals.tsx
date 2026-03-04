import { useState, useEffect } from "react";
import { Zap } from "lucide-react";
import { useFlashSaleProducts } from "@/hooks/useApi";
import { ProductCard } from "@/components/ProductCard";

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

export function FlashDeals() {
  const { data: promoProducts = [] } = useFlashSaleProducts();

  // Use the nearest flash_sale_end from products, fallback to end of day
  const targetDate = (() => {
    const ends = promoProducts
      .filter(p => p.flashSaleEnd)
      .map(p => new Date(p.flashSaleEnd!).getTime())
      .filter(t => t > Date.now())
      .sort((a, b) => a - b);
    if (ends.length > 0) return new Date(ends[0]);
    const d = new Date(); d.setHours(23, 59, 59, 999); return d;
  })();
  const { hours, minutes, seconds } = useCountdown(targetDate);

  return (
    <section className="rounded-2xl border border-destructive/20 bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-destructive/5 border-b border-destructive/10">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-destructive flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Ofertas Relâmpago</h3>
            <p className="text-[11px] text-muted-foreground">Descontos por tempo limitado!</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground font-medium mr-1">Termina em</span>
          {[
            { value: hours, label: "h" },
            { value: minutes, label: "m" },
            { value: seconds, label: "s" },
          ].map(({ value, label }) => (
            <div key={label} className="flex items-center gap-0.5">
              <span className="bg-foreground text-background text-xs font-bold px-1.5 py-1 rounded-md min-w-[28px] text-center">
                {String(value).padStart(2, "0")}
              </span>
              <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Products */}
      <div className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {promoProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
