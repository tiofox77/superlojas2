import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Store, LayoutDashboard, Plus } from "lucide-react";

export default function MyStore() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
      </main>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/entrar" replace />;
  }

  if (user.role === "super_admin") {
    return <Navigate to="/admin" replace />;
  }

  const stores = user.stores && user.stores.length > 0
    ? user.stores
    : user.store ? [user.store] : [];

  // Single store — redirect directly
  if (stores.length === 1 && stores[0].slug) {
    return <Navigate to={`/loja/${stores[0].slug}/painel`} replace />;
  }

  // Multiple stores — show selector
  if (stores.length > 1) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center mx-auto mb-3">
              <Store className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Minhas Lojas</h1>
            <p className="text-sm text-gray-500 mt-1">Selecione a loja que deseja gerir</p>
          </div>
          <div className="space-y-3">
            {stores.map((s) => (
              <Link
                key={s.slug}
                to={`/loja/${s.slug}/painel`}
                className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-200 hover:border-orange-300 hover:shadow-md transition-all group"
              >
                {s.logo ? (
                  <img src={s.logo} alt="" className="h-12 w-12 rounded-xl object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-lg">
                    {s.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate group-hover:text-orange-600 transition-colors">{s.name}</p>
                  <p className="text-xs text-gray-400">/{s.slug}</p>
                </div>
                {s.status !== "approved" && (
                  <span className="text-[10px] font-bold bg-amber-50 text-amber-600 px-2 py-1 rounded-full">
                    {s.status === "pending" ? "Pendente" : s.status}
                  </span>
                )}
                <LayoutDashboard className="h-5 w-5 text-gray-300 group-hover:text-orange-500 transition-colors" />
              </Link>
            ))}
            <Link
              to="/cadastro-loja"
              className="flex items-center justify-center gap-2 p-4 bg-white rounded-2xl border-2 border-dashed border-gray-200 hover:border-emerald-300 text-gray-500 hover:text-emerald-600 transition-all"
            >
              <Plus className="h-5 w-5" />
              <span className="font-medium text-sm">Abrir Nova Loja</span>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // No stores — redirect to store registration
  return <Navigate to="/cadastro-loja" replace />;
}
