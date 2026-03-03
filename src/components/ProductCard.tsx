import { Link } from "react-router-dom";
import { Star, ShoppingCart, Heart } from "lucide-react";
import { Product } from "@/data/types";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { productImgSrc, onImgError } from "@/lib/imageHelpers";
import { toast } from "sonner";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const wishlisted = isInWishlist(product.id);
  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  const formatPrice = (val: number) =>
    new Intl.NumberFormat("pt-AO").format(val);

  return (
    <div className="group rounded-xl border border-border bg-card shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden flex flex-col">
      <Link to={`/produto/${product.slug}`} className="relative aspect-square overflow-hidden bg-secondary">
        <img
          src={productImgSrc(product.images[0])}
          alt={product.name}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={onImgError("product")}
        />
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.badge === "Promo" && discount && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-destructive text-primary-foreground">
              -{discount}%
            </span>
          )}
          {product.badge === "Novo" && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-success text-primary-foreground">
              Novo
            </span>
          )}
        </div>
        {/* Wishlist */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(product);
          }}
          className={`absolute top-2 right-2 h-7 w-7 rounded-full flex items-center justify-center transition-all ${
            wishlisted
              ? "bg-destructive/10 opacity-100"
              : "bg-card/80 backdrop-blur opacity-0 group-hover:opacity-100 hover:bg-card"
          }`}
        >
          <Heart className={`h-3.5 w-3.5 ${wishlisted ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
        </button>
        {/* Quick add */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            addItem(product, 1, {});
            toast.success(`"${product.name}" adicionado ao carrinho`);
          }}
          className="absolute bottom-2 right-2 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all shadow-md"
          aria-label="Adicionar ao carrinho"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
        </button>
      </Link>
      <div className="p-3 flex flex-col flex-1">
        <Link to={`/lojas/${product.store.slug}`} className="text-[10px] text-primary font-medium hover:underline mb-0.5">
          {product.store.name}
        </Link>
        <Link to={`/produto/${product.slug}`}>
          <h3 className="text-xs font-medium line-clamp-2 mb-2 group-hover:text-primary transition-colors leading-snug">
            {product.name}
          </h3>
        </Link>
        <div className="mt-auto">
          <div className="flex items-center gap-1 mb-1">
            <Star className="h-3 w-3 fill-warning text-warning" />
            <span className="text-[10px] text-muted-foreground">{product.rating} ({product.reviewCount})</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-sm">{formatPrice(product.price)} <span className="text-xs font-normal">Kz</span></span>
            {product.originalPrice && (
              <span className="text-[10px] text-muted-foreground line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
