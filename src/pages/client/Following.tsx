import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Store, Heart, MapPin, Star, Package, Users, Loader2, Search } from "lucide-react";
import { useState } from "react";
import { logoSrc, onImgError } from "@/lib/imageHelpers";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

interface FollowedStore {
  id: number;
  name: string;
  slug: string;
  logo: string;
  description: string;
  province: string;
  city: string;
  rating: string;
  review_count: number;
  products_count: number;
  followers_count: number;
}

export default function ClientFollowing() {
  const { token } = useAuth();
  const s = useAdminStyles();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: stores = [], isLoading } = useQuery<FollowedStore[]>({
    queryKey: ["following"],
    queryFn: async () => {
      const res = await fetch(`${API}/client/following`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      return res.json();
    },
    enabled: !!token,
  });

  const unfollowMutation = useMutation({
    mutationFn: async (storeId: number) => {
      await fetch(`${API}/client/follow/${storeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["following"] });
    },
  });

  const filtered = search
    ? stores.filter((st) => st.name.toLowerCase().includes(search.toLowerCase()))
    : stores;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className={`text-lg font-bold ${s.textPrimary}`}>Lojas Seguidas</h2>
          <p className={`text-xs ${s.textMuted}`}>{stores.length} loja{stores.length !== 1 ? "s" : ""} seguida{stores.length !== 1 ? "s" : ""}</p>
        </div>
        {stores.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input type="text" placeholder="Buscar loja..." value={search} onChange={(e) => setSearch(e.target.value)}
              className={`pl-9 pr-3 py-2 text-xs rounded-xl border ${s.input} w-48 focus:outline-none focus:ring-2 focus:ring-orange-500/20`} />
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className={`rounded-2xl border ${s.card} p-12 text-center`}>
          <Heart className={`h-12 w-12 mx-auto mb-3 ${s.textMuted}`} />
          <h3 className={`text-sm font-bold ${s.textPrimary} mb-1`}>
            {search ? "Nenhuma loja encontrada" : "Ainda nao segue nenhuma loja"}
          </h3>
          <p className={`text-xs ${s.textMuted} mb-4`}>
            {search ? "Tente outro termo de busca." : "Explore as lojas e comece a seguir as que mais gosta!"}
          </p>
          {!search && (
            <Link to="/lojas" className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold ${s.btnPrimary}`}>
              <Store className="h-3.5 w-3.5" /> Explorar Lojas
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((store) => (
            <div key={store.id} className={`rounded-2xl border ${s.card} overflow-hidden group`}>
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <Link to={`/lojas/${store.slug}`}>
                    <img src={logoSrc(store.logo, store.name)} alt={store.name}
                      className="h-14 w-14 rounded-xl object-cover border border-border shrink-0"
                      onError={onImgError("logo", store.name)} />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/lojas/${store.slug}`} className={`text-sm font-bold ${s.textPrimary} hover:text-orange-500 transition-colors truncate block`}>
                      {store.name}
                    </Link>
                    <p className={`text-[11px] ${s.textMuted} flex items-center gap-1 mt-0.5`}>
                      <MapPin className="h-3 w-3" /> {store.province}, {store.city}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px]">
                      <span className={`flex items-center gap-1 ${s.textMuted}`}>
                        <Star className="h-3 w-3 fill-warning text-warning" /> {Number(store.rating).toFixed(1)}
                      </span>
                      <span className={`flex items-center gap-1 ${s.textMuted}`}>
                        <Package className="h-3 w-3" /> {store.products_count} produtos
                      </span>
                      <span className={`flex items-center gap-1 ${s.textMuted}`}>
                        <Users className="h-3 w-3" /> {store.followers_count}
                      </span>
                    </div>
                  </div>
                </div>
                <p className={`text-[11px] ${s.textMuted} mt-2 line-clamp-2`}>{store.description}</p>
                <div className="flex items-center gap-2 mt-3">
                  <Link to={`/lojas/${store.slug}`}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold ${s.btnPrimary}`}>
                    <Store className="h-3.5 w-3.5" /> Ver Loja
                  </Link>
                  <button
                    onClick={() => unfollowMutation.mutate(store.id)}
                    disabled={unfollowMutation.isPending}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border ${s.isDark ? "border-white/10 text-white/50 hover:text-red-400 hover:border-red-400/30" : "border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-200"} transition-colors`}>
                    <Heart className="h-3.5 w-3.5 fill-current" /> Deixar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
