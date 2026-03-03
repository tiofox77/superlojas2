import { useQuery } from "@tanstack/react-query";
import fetchApi from "@/services/api";
import {
  transformCategory,
  transformStore,
  transformProduct,
  transformHeroSlide,
  type ApiCategory,
  type ApiStore,
  type ApiProduct,
  type ApiHeroSlide,
} from "@/services/transformers";
import type { Category, Store, Product, HeroSlide } from "@/data/types";

// ─── Categories ───────────────────────────────────────────────
export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const data = await fetchApi<ApiCategory[]>("/categories");
      return data.map(transformCategory);
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}

export function useCategory(slug: string) {
  return useQuery<Category>({
    queryKey: ["category", slug],
    queryFn: async () => {
      const data = await fetchApi<ApiCategory>(`/categories/${slug}`);
      return transformCategory(data);
    },
    enabled: !!slug,
  });
}

// ─── Stores ───────────────────────────────────────────────────
export function useStores(params?: { province?: string; search?: string }) {
  return useQuery<Store[]>({
    queryKey: ["stores", params],
    queryFn: async () => {
      const data = await fetchApi<ApiStore[]>("/stores", params as Record<string, string>);
      return data.map(transformStore);
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useFeaturedStores() {
  return useQuery<Store[]>({
    queryKey: ["stores", "featured"],
    queryFn: async () => {
      const data = await fetchApi<ApiStore[]>("/stores/featured");
      return data.map(transformStore);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useStore(slug: string) {
  return useQuery<Store & { products: Product[]; heroSlides: HeroSlide[] }>({
    queryKey: ["store", slug],
    queryFn: async () => {
      const data = await fetchApi<ApiStore & { products: ApiProduct[]; hero_slides: ApiHeroSlide[] }>(`/stores/${slug}`);
      return {
        ...transformStore(data),
        products: (data.products ?? []).map(transformProduct),
        heroSlides: (data.hero_slides ?? []).map(transformHeroSlide),
      };
    },
    enabled: !!slug,
  });
}

// ─── Products ─────────────────────────────────────────────────
export function useProducts(params?: Record<string, string>) {
  return useQuery<Product[]>({
    queryKey: ["products", params],
    queryFn: async () => {
      const data = await fetchApi<ApiProduct[]>("/products", params);
      return data.map(transformProduct);
    },
    enabled: params !== undefined,
    staleTime: 2 * 60 * 1000,
  });
}

export function useTrendingProducts() {
  return useQuery<Product[]>({
    queryKey: ["products", "trending"],
    queryFn: async () => {
      const data = await fetchApi<ApiProduct[]>("/products/trending");
      return data.map(transformProduct);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useFlashSaleProducts() {
  return useQuery<Product[]>({
    queryKey: ["products", "flash-sale"],
    queryFn: async () => {
      const data = await fetchApi<ApiProduct[]>("/products/flash-sale");
      return data.map(transformProduct);
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useProduct(slug: string) {
  return useQuery<Product>({
    queryKey: ["product", slug],
    queryFn: async () => {
      const data = await fetchApi<ApiProduct>(`/products/${slug}`);
      return transformProduct(data);
    },
    enabled: !!slug,
  });
}

// ─── Hero Slides ──────────────────────────────────────────────
export function useHeroSlides() {
  return useQuery<HeroSlide[]>({
    queryKey: ["hero-slides"],
    queryFn: async () => {
      const data = await fetchApi<ApiHeroSlide[]>("/hero-slides");
      return data.map(transformHeroSlide);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useStoreHeroSlides(slug: string) {
  return useQuery<HeroSlide[]>({
    queryKey: ["hero-slides", "store", slug],
    queryFn: async () => {
      const data = await fetchApi<ApiHeroSlide[]>(`/hero-slides/store/${slug}`);
      return data.map(transformHeroSlide);
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Provinces ────────────────────────────────────────────────
export function useProvinces() {
  return useQuery<string[]>({
    queryKey: ["provinces"],
    queryFn: () => fetchApi<string[]>("/provinces"),
    staleTime: 60 * 60 * 1000, // 1 hour cache
  });
}
