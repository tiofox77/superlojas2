import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCategories } from "@/hooks/useApi";
import { useRef } from "react";

const COLORS = [
  "from-orange-500/10 to-amber-500/10 border-orange-200/50",
  "from-blue-500/10 to-cyan-500/10 border-blue-200/50",
  "from-emerald-500/10 to-teal-500/10 border-emerald-200/50",
  "from-purple-500/10 to-pink-500/10 border-purple-200/50",
  "from-rose-500/10 to-red-500/10 border-rose-200/50",
  "from-cyan-500/10 to-sky-500/10 border-cyan-200/50",
  "from-amber-500/10 to-yellow-500/10 border-amber-200/50",
  "from-indigo-500/10 to-violet-500/10 border-indigo-200/50",
  "from-lime-500/10 to-green-500/10 border-lime-200/50",
  "from-fuchsia-500/10 to-pink-500/10 border-fuchsia-200/50",
];

export function FeaturedCategories() {
  const { data: categories = [] } = useCategories();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 200, behavior: "smooth" });
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold">Categorias em Destaque</h2>
          <p className="text-xs text-muted-foreground">Navegue pelas categorias e encontre o que precisa</p>
        </div>
        <div className="flex gap-1">
          <button onClick={() => scroll(-1)} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-secondary transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => scroll(1)} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-secondary transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {categories.map((cat, i) => (
          <Link
            key={cat.id}
            to={`/categoria/${cat.slug}`}
            className="flex-shrink-0 w-32 group"
          >
            <div className={`aspect-square rounded-2xl overflow-hidden bg-gradient-to-br ${COLORS[i % COLORS.length]} border mb-2 flex items-center justify-center group-hover:shadow-md group-hover:scale-[1.03] transition-all duration-300`}>
              <span className="text-5xl group-hover:scale-110 transition-transform duration-300">{cat.icon || "📦"}</span>
            </div>
            <p className="text-xs font-medium text-center truncate">{cat.name}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
