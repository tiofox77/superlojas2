import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Heart, Loader2, Rss, Store, Star, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { productImgSrc, logoSrc, onImgError } from "@/lib/imageHelpers";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

interface FeedProduct {
  id: number;
  name: string;
  slug: string;
  price: string;
  original_price: string | null;
  currency: string;
  images: string[];
  category: string;
  badge: string | null;
  rating: string;
  stock: number;
  created_at: string;
  store: {
    id: number;
    name: string;
    slug: string;
    logo: string;
  };
}

interface FeedResponse {
  data: FeedProduct[];
  current_page: number;
  last_page: number;
  total: number;
}

export default function ClientFeed() {
  const { token } = useAuth();
  const s = useAdminStyles();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<FeedResponse>({
    queryKey: ["feed", page],
    queryFn: async () => {
      const res = await fetch(`${API}/client/feed?page=${page}&per_page=20`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      return res.json();
    },
    enabled: !!token,
  });

  const products = data?.data || [];
  const formatPrice = (val: string | number) => new Intl.NumberFormat("pt-AO").format(Number(val));
  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-lg font-bold ${s.textPrimary} flex items-center gap-2`}>
          <Rss className="h-5 w-5 text-orange-500" /> Feed
        </h2>
        <p className={`text-xs ${s.textMuted}`}>Novidades das lojas que segue</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : products.length === 0 ? (
        <div className={`rounded-2xl border ${s.card} p-12 text-center`}>
          <Rss className={`h-12 w-12 mx-auto mb-3 ${s.textMuted}`} />
          <h3 className={`text-sm font-bold ${s.textPrimary} mb-1`}>O seu feed esta vazio</h3>
          <p className={`text-xs ${s.textMuted} mb-4`}>Siga lojas para ver os seus produtos mais recentes aqui!</p>
          <Link to="/lojas" className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold ${s.btnPrimary}`}>
            <Store className="h-3.5 w-3.5" /> Explorar Lojas
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {products.map((product) => (
              <div key={product.id} className={`rounded-2xl border ${s.card} overflow-hidden`}>
                {/* Store header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
                  <Link to={`/lojas/${product.store.slug}`}>
                    <img src={logoSrc(product.store.logo, product.store.name)} alt={product.store.name}
                      className="h-8 w-8 rounded-lg object-cover" onError={onImgError("logo", product.store.name)} />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/lojas/${product.store.slug}`} className={`text-xs font-bold ${s.textPrimary} hover:text-orange-500 transition-colors`}>
                      {product.store.name}
                    </Link>
                    <p className={`text-[10px] ${s.textMuted}`}>adicionou um produto · {timeAgo(product.created_at)}</p>
                  </div>
                </div>

                {/* Product content */}
                <Link to={`/produto/${product.slug}`} className="flex gap-4 p-4 group">
                  <img src={productImgSrc(product.images?.[0])} alt={product.name}
                    className="h-28 w-28 sm:h-32 sm:w-32 rounded-xl object-cover bg-secondary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-medium ${s.textMuted}`}>{product.category}</span>
                      {product.badge && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${product.badge === "Promo" ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"}`}>
                          {product.badge}
                        </span>
                      )}
                    </div>
                    <h3 className={`text-sm font-semibold ${s.textPrimary} group-hover:text-orange-500 transition-colors line-clamp-2`}>
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Star className="h-3 w-3 fill-warning text-warning" />
                      <span className={`text-[10px] ${s.textMuted}`}>{Number(product.rating).toFixed(1)}</span>
                      {product.stock > 0 ? (
                        <span className="text-[9px] text-emerald-500 font-medium ml-1">Em stock</span>
                      ) : (
                        <span className="text-[9px] text-red-500 font-medium ml-1">Esgotado</span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className={`font-bold text-base ${s.textPrimary}`}>{formatPrice(product.price)} Kz</span>
                      {product.original_price && (
                        <span className={`text-xs ${s.textMuted} line-through`}>{formatPrice(product.original_price)} Kz</span>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {data && data.last_page > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${s.isDark ? "border-white/10" : "border-gray-200"} ${s.textMuted} disabled:opacity-30`}>
                Anterior
              </button>
              <span className={`text-xs ${s.textMuted}`}>{page} de {data.last_page}</span>
              <button onClick={() => setPage((p) => Math.min(data.last_page, p + 1))} disabled={page === data.last_page}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${s.isDark ? "border-white/10" : "border-gray-200"} ${s.textMuted} disabled:opacity-30`}>
                Seguinte
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
