import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getStoreSlugFromSubdomain } from "@/hooks/useSubdomain";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

interface SubdomainStore {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  banner: string | null;
  description: string;
  province: string;
  city: string;
  whatsapp: string | null;
  email: string | null;
  phone: string | null;
  categories: string[];
  socials: Record<string, string> | null;
  payment_methods: any[];
  business_hours: any;
  announcement: string | null;
  announcement_active: boolean;
  rating: number;
  review_count: number;
  is_official: boolean;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  plan: string;
}

interface SubdomainStoreContextType {
  store: SubdomainStore | null;
  loading: boolean;
  error: string | null;
  needsUpgrade: boolean;
  storeSlug: string | null;
}

const SubdomainStoreContext = createContext<SubdomainStoreContextType>({
  store: null,
  loading: true,
  error: null,
  needsUpgrade: false,
  storeSlug: null,
});

export function useSubdomainStore() {
  return useContext(SubdomainStoreContext);
}

export function SubdomainStoreProvider({ children }: { children: ReactNode }) {
  const storeSlug = getStoreSlugFromSubdomain();
  const [store, setStore] = useState<SubdomainStore | null>(null);
  const [loading, setLoading] = useState(!!storeSlug);
  const [error, setError] = useState<string | null>(null);
  const [needsUpgrade, setNeedsUpgrade] = useState(false);

  useEffect(() => {
    if (!storeSlug) return;

    fetch(`${API}/subdomain/resolve/${storeSlug}`, {
      headers: { Accept: "application/json" },
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStore(data.store);
        } else if (res.status === 403 && data.upgrade) {
          setNeedsUpgrade(true);
          setError(data.error);
        } else {
          setError(data.error || "Loja nao encontrada");
        }
      })
      .catch(() => setError("Erro de conexao"))
      .finally(() => setLoading(false));
  }, [storeSlug]);

  return (
    <SubdomainStoreContext.Provider value={{ store, loading, error, needsUpgrade, storeSlug }}>
      {children}
    </SubdomainStoreContext.Provider>
  );
}
