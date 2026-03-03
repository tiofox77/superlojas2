import { Link } from "react-router-dom";
import { useCategories } from "@/hooks/useApi";

export function HotCategories() {
  const { data: globalCategories = [] } = useCategories();

  return (
    <div className="rounded-2xl border border-border bg-card p-4 h-full">
      <h3 className="text-sm font-bold mb-3 flex items-center gap-1">
        🔥 Categorias Populares
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {globalCategories.slice(0, 8).map((cat) => (
          <Link
            key={cat.id}
            to={`/categoria/${cat.slug}`}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-secondary/50 hover:bg-accent hover:text-accent-foreground transition-all group"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">{cat.icon}</span>
            <span className="text-[11px] font-medium text-center leading-tight">{cat.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
