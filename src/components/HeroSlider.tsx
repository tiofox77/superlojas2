import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useHeroSlides } from "@/hooks/useApi";
import { motion, AnimatePresence } from "framer-motion";

export function HeroSlider() {
  const { data: heroSlides = [] } = useHeroSlides();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const timer = setInterval(() => setCurrent((p) => (p + 1) % heroSlides.length), 5000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  if (heroSlides.length === 0) return <div className="h-full min-h-[280px] sm:min-h-[360px] rounded-2xl bg-secondary animate-pulse" />;
  const slide = heroSlides[current];

  return (
    <div className="relative overflow-hidden rounded-2xl h-full min-h-[280px] sm:min-h-[360px]">
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.4 }}
          className={`bg-gradient-to-r ${slide.bgColor} px-8 py-12 sm:px-12 sm:py-16 text-primary-foreground h-full flex flex-col justify-center min-h-[280px] sm:min-h-[360px]`}
        >
          <div className="max-w-md">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary-foreground/70 mb-2">
              SuperLojas
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-3 leading-tight">{slide.title}</h2>
            <p className="text-primary-foreground/80 text-sm sm:text-base mb-6">{slide.subtitle}</p>
            <Link
              to={slide.ctaLink}
              className="inline-block rounded-xl bg-card text-foreground px-6 py-2.5 font-semibold text-sm hover:opacity-90 transition-opacity shadow-md"
            >
              {slide.cta} →
            </Link>
          </div>
        </motion.div>
      </AnimatePresence>
      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {heroSlides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-2 rounded-full transition-all ${i === current ? "w-6 bg-primary-foreground" : "w-2 bg-primary-foreground/40"}`}
          />
        ))}
      </div>
      {/* Arrows */}
      <button
        onClick={() => setCurrent((p) => (p - 1 + heroSlides.length) % heroSlides.length)}
        className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-card/20 backdrop-blur flex items-center justify-center text-primary-foreground hover:bg-card/40 transition-colors"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={() => setCurrent((p) => (p + 1) % heroSlides.length)}
        className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-card/20 backdrop-blur flex items-center justify-center text-primary-foreground hover:bg-card/40 transition-colors"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
