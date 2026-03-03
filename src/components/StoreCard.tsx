import { Link } from "react-router-dom";
import { Star, MapPin, BadgeCheck } from "lucide-react";
import { Store } from "@/data/types";
import { logoSrc, onImgError } from "@/lib/imageHelpers";

export function StoreCard({ store }: { store: Store }) {
  return (
    <Link
      to={`/lojas/${store.slug}`}
      className="group block rounded-xl border border-border bg-card p-4 shadow-card hover:shadow-card-hover transition-all duration-300"
    >
      <div className="flex items-center gap-3 mb-3">
        <img
          src={logoSrc(store.logo, store.name)}
          alt={store.name}
          className="h-12 w-12 rounded-lg object-cover"
          loading="lazy"
          onError={onImgError("logo", store.name)}
        />
        <div className="min-w-0">
          <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors flex items-center gap-1">
            {store.name}
            {store.isOfficial && <BadgeCheck className="h-4 w-4 text-blue-500 shrink-0" />}
          </h3>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {store.province}, {store.city}
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{store.description}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-warning text-warning" />
          <span className="text-xs font-medium">{store.rating}</span>
          <span className="text-xs text-muted-foreground">({store.reviewCount})</span>
        </div>
        <span className="text-xs font-medium text-primary group-hover:underline">Ver loja →</span>
      </div>
    </Link>
  );
}
