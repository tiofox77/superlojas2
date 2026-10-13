import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useHeroSlides } from "@/hooks/useApi";

export function HeroSlider() {
  const { data: heroSlides = [] } = useHeroSlides();
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback((index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrent(index);
    setTimeout(() => setIsTransitioning(false), 500);
  }, [isTransitioning]);

  const next = useCallback(() => {
    if (heroSlides.length <= 1) return;
    goTo((current + 1) % heroSlides.length);
  }, [current, heroSlides.length, goTo]);

  const prev = useCallback(() => {
    if (heroSlides.length <= 1) return;
    goTo((current - 1 + heroSlides.length) % heroSlides.length);
  }, [current, heroSlides.length, goTo]);

  useEffect(() => {
    if (heroSlides.length <= 1) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent((p) => (p + 1) % heroSlides.length);
    }, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [heroSlides.length, current]);

  if (heroSlides.length === 0) return <div className="h-full min-h-[280px] sm:min-h-[360px] rounded-2xl bg-secondary animate-pulse" />;

  return (
    <div className="relative overflow-hidden rounded-2xl h-full min-h-[280px] sm:min-h-[360px] shadow-sm" role="region" aria-label="Destaques SuperLoja">
      {/* All slides stacked, only current visible via opacity */}
      {heroSlides.map((slide, i) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${i === current ? "opacity-100 z-10" : "opacity-0 z-0"}`}
        >
          {/* Background color fallback */}
          <div className={`absolute inset-0 ${!slide.bgColor || slide.bgColor === "none" ? "bg-gray-900" : `bg-gradient-to-r ${slide.bgColor}`}`} />
          {/* Image — full visibility, no blend */}
          {slide.image && (
            <img src={slide.image} alt={slide.title} className="absolute inset-0 w-full h-full object-cover" />
          )}
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/25 to-transparent" />
          {/* Content */}
          <div className="relative z-10 px-8 py-12 sm:px-12 sm:py-16 h-full flex flex-col justify-center min-h-[280px] sm:min-h-[360px]">
            <div className="max-w-md">
              <span className="inline-block text-xs font-semibold uppercase tracking-widest text-white/70 mb-2">
                SuperLoja
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold mb-3 leading-tight text-white drop-shadow-lg">{slide.title}</h2>
              {slide.subtitle && <p className="text-white/85 text-sm sm:text-base mb-6 drop-shadow">{slide.subtitle}</p>}
              {slide.cta && slide.ctaLink && (
                <Link
                  to={slide.ctaLink}
                  className="inline-block rounded-xl bg-white text-gray-900 px-6 py-2.5 font-semibold text-sm hover:bg-white/90 transition-colors shadow-lg"
                >
                  {slide.cta} →
                </Link>
              )}
            </div>
          </div>
        </div>
      ))}
      {/* Spacer to maintain height */}
      <div className="invisible px-8 py-12 sm:px-12 sm:py-16 min-h-[280px] sm:min-h-[360px]" />
      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {heroSlides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Mostrar destaque ${i + 1}`}
            aria-current={i === current ? "true" : undefined}
            className={`h-2 rounded-full transition-all ${i === current ? "w-6 bg-white" : "w-2 bg-white/40"}`}
          />
        ))}
      </div>
      {/* Arrows */}
      <button
        onClick={prev}
        aria-label="Destaque anterior"
        className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/20 backdrop-blur flex items-center justify-center text-white hover:bg-black/40 transition-colors z-20"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={next}
        aria-label="Próximo destaque"
        className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/20 backdrop-blur flex items-center justify-center text-white hover:bg-black/40 transition-colors z-20"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
