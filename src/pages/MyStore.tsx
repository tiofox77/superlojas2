import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

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

  if (user.role === "store_owner" && user.store?.slug) {
    return <Navigate to={`/loja/${user.store.slug}/painel`} replace />;
  }

  if (user.role === "super_admin") {
    return <Navigate to="/admin" replace />;
  }

  // Customer or user without store — redirect to store registration
  return <Navigate to="/cadastro-loja" replace />;
}
