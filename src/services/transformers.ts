import type { Category, Store, Product, HeroSlide } from "@/data/types";

// Raw API types (snake_case from Laravel)
interface ApiSubcategory {
  id: number;
  name: string;
  slug: string;
  product_count: number;
}

interface ApiCategory {
  id: number;
  name: string;
  slug: string;
  icon: string;
  product_count: number;
  subcategories?: ApiSubcategory[];
}

interface ApiStoreSocials {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  website?: string;
}

interface ApiStore {
  id: number;
  name: string;
  slug: string;
  description: string;
  logo: string;
  banner: string;
  province: string;
  city: string;
  whatsapp: string;
  rating: string | number;
  review_count: number;
  status: "pending" | "approved" | "rejected";
  categories: string[];
  socials: ApiStoreSocials | null;
  payment_methods?: { type: string; label: string; details: string; account: string; is_active: boolean }[] | null;
  show_stock?: boolean;
  is_official?: boolean;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  products?: ApiProduct[];
  hero_slides?: ApiHeroSlide[];
}

interface ApiProduct {
  id: number;
  name: string;
  slug: string;
  price: string | number;
  original_price: string | number | null;
  currency: string;
  images: string[];
  store_id: number;
  store?: ApiStore;
  category: string;
  badge: "Promo" | "Novo" | null;
  rating: string | number;
  review_count: number;
  stock: number;
  description: string;
  variants: { type: string; options: string[] }[];
  flash_sale_start: string | null;
  flash_sale_end: string | null;
}

interface ApiHeroSlide {
  id: number;
  title: string;
  subtitle: string;
  cta: string;
  cta_link: string;
  bg_color: string;
  image: string | null;
  store_slug: string | null;
  sort_order: number;
}

export function transformCategory(api: ApiCategory): Category {
  return {
    id: String(api.id),
    name: api.name,
    slug: api.slug,
    icon: api.icon,
    productCount: api.product_count,
    subcategories: (api.subcategories ?? []).map((sub) => ({
      id: String(sub.id),
      name: sub.name,
      slug: sub.slug,
      productCount: sub.product_count,
    })),
  };
}

export function transformStore(api: ApiStore): Store {
  return {
    id: String(api.id),
    name: api.name,
    slug: api.slug,
    description: api.description,
    logo: api.logo,
    banner: api.banner,
    province: api.province,
    city: api.city,
    whatsapp: api.whatsapp,
    rating: Number(api.rating),
    reviewCount: api.review_count,
    status: api.status,
    categories: api.categories ?? [],
    socials: api.socials ?? undefined,
    paymentMethods: api.payment_methods ?? undefined,
    showStock: api.show_stock ?? true,
    isOfficial: api.is_official ?? false,
    metaTitle: api.meta_title || undefined,
    metaDescription: api.meta_description || undefined,
    metaKeywords: api.meta_keywords || undefined,
  };
}

export function transformProduct(api: ApiProduct): Product {
  return {
    id: String(api.id),
    name: api.name,
    slug: api.slug,
    price: Number(api.price),
    originalPrice: api.original_price ? Number(api.original_price) : undefined,
    currency: api.currency,
    images: api.images,
    store: api.store ? transformStore(api.store) : ({} as Store),
    category: api.category,
    badge: api.badge ?? undefined,
    rating: Number(api.rating),
    reviewCount: api.review_count,
    stock: api.stock,
    description: api.description,
    variants: api.variants ?? [],
    flashSaleStart: api.flash_sale_start ?? undefined,
    flashSaleEnd: api.flash_sale_end ?? undefined,
  };
}

export function transformHeroSlide(api: ApiHeroSlide): HeroSlide {
  return {
    id: String(api.id),
    title: api.title,
    subtitle: api.subtitle,
    cta: api.cta,
    ctaLink: api.cta_link,
    bgColor: api.bg_color,
    image: api.image || null,
  };
}

export type { ApiCategory, ApiStore, ApiProduct, ApiHeroSlide };
