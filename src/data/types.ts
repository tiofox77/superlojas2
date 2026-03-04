export interface Subcategory {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  productCount: number;
  subcategories: Subcategory[];
}

export interface StoreSocials {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  website?: string;
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo: string;
  banner: string;
  province: string;
  city: string;
  whatsapp: string;
  rating: number;
  reviewCount: number;
  status: "pending" | "approved" | "rejected";
  categories: string[];
  socials?: StoreSocials;
  paymentMethods?: { type: string; label: string; details: string; account: string; is_active: boolean }[];
  showStock?: boolean;
  isOfficial?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
}

export interface ProductVariant {
  type: string;
  options: string[];
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  currency: string;
  images: string[];
  store: Store;
  category: string;
  badge?: "Promo" | "Novo";
  rating: number;
  reviewCount: number;
  stock: number;
  description: string;
  variants: ProductVariant[];
  flashSaleStart?: string;
  flashSaleEnd?: string;
  subcategory?: string;
  categoryId?: string;
  subcategoryId?: string;
}

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  ctaLink: string;
  bgColor: string;
  image: string | null;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariants: Record<string, string>;
}
