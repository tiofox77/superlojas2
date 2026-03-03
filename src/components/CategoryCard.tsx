import { Link } from "react-router-dom";
import { Category } from "@/data/types";

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      to={`/categoria/${category.slug}`}
      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all duration-300 group"
    >
      <span className="text-3xl group-hover:scale-110 transition-transform">{category.icon}</span>
      <span className="text-xs font-medium text-center">{category.name}</span>
      <span className="text-[10px] text-muted-foreground">{category.productCount} produtos</span>
    </Link>
  );
}
