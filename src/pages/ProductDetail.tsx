import { useParams, Link } from "react-router-dom";
import { useProduct, useProducts } from "@/hooks/useApi";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { Star, ShoppingCart, MessageCircle, ChevronRight, Minus, Plus, Truck, Heart, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ReviewSection } from "@/components/ReviewSection";
import { toast } from "sonner";

const ProductDetail = () => {
  const { slug } = useParams();
  const { data: product, isLoading } = useProduct(slug || "");
  const { data: relatedProducts = [] } = useProducts(product ? { category: product.category } : undefined);
  const { addItem } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [selectedImage, setSelectedImage] = useState(0);
  const [stockAlert, setStockAlert] = useState("");

  if (isLoading) {
    return (
      <main className="container py-16 text-center min-h-screen">
        <div className="h-8 w-48 bg-secondary animate-pulse rounded mx-auto" />
      </main>
    );
  }

  if (!product) {
    return (
      <main className="container py-16 text-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Produto não encontrado</h1>
        <Link to="/" className="text-primary hover:underline">Voltar ao início</Link>
      </main>
    );
  }

  const wishlisted = isInWishlist(product.id);
  const formatPrice = (val: number) => new Intl.NumberFormat("pt-AO").format(val);
  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  const whatsAppMsg = encodeURIComponent(
    `Olá, quero comprar:\n\n• ${product.name}${Object.entries(selectedVariants).map(([k, v]) => ` (${k}: ${v})`).join("")} x${quantity} — ${formatPrice(product.price * quantity)} Kz\n\nEnviado via SuperLojas`
  );

  const related = relatedProducts.filter((p) => p.id !== product.id).slice(0, 4);

  return (
    <main className="container py-8 min-h-screen">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-foreground">Início</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to={`/lojas/${product.store.slug}`} className="hover:text-foreground">{product.store.name}</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground truncate">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <div>
          <div className="aspect-square rounded-2xl overflow-hidden bg-secondary mb-3">
            <img src={product.images[selectedImage]} alt={product.name} className="h-full w-full object-cover" />
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`flex-shrink-0 h-16 w-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedImage === i ? "border-primary" : "border-border hover:border-primary/40"
                  }`}
                >
                  <img src={img} alt={`${product.name} ${i + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <Link to={`/lojas/${product.store.slug}`} className="text-xs text-primary font-medium hover:underline">
            {product.store.name}
          </Link>
          <h1 className="text-2xl font-bold mt-1 mb-3">{product.name}</h1>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-warning text-warning" />
              <span className="text-sm font-medium">{product.rating}</span>
              <span className="text-sm text-muted-foreground">({product.reviewCount} avaliações)</span>
            </div>
            {product.store?.showStock !== false && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${product.stock > 0 ? (product.stock <= 5 ? "bg-warning/10 text-warning" : "bg-success/10 text-success") : "bg-destructive/10 text-destructive"}`}>
                {product.stock > 0 ? (product.stock <= 5 ? `Ultimas ${product.stock} unidades!` : `${product.stock} em estoque`) : "Esgotado"}
              </span>
            )}
            {product.store?.showStock === false && product.stock <= 0 && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">Esgotado</span>
            )}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-3xl font-extrabold">{formatPrice(product.price)} Kz</span>
            {product.originalPrice && (
              <>
                <span className="text-lg text-muted-foreground line-through">{formatPrice(product.originalPrice)} Kz</span>
                <span className="text-sm font-bold text-destructive">-{discount}%</span>
              </>
            )}
          </div>

          {/* Variants */}
          {product.variants.map((v) => (
            <div key={v.type} className="mb-4">
              <p className="text-sm font-medium mb-2">{v.type}</p>
              <div className="flex flex-wrap gap-2">
                {v.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setSelectedVariants((prev) => ({ ...prev, [v.type]: opt }))}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                      selectedVariants[v.type] === opt
                        ? "border-primary bg-accent text-accent-foreground font-medium"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Quantity */}
          <div className="flex flex-col gap-2 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Quantidade</span>
              <div className="flex items-center border border-border rounded-lg">
                <button onClick={() => { setQuantity(Math.max(1, quantity - 1)); setStockAlert(""); }} className="px-3 py-2 hover:bg-secondary">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="px-4 py-2 text-sm font-medium border-x border-border">{quantity}</span>
                <button onClick={() => {
                  if (product.stock > 0 && quantity >= product.stock) {
                    setStockAlert(`Apenas ${product.stock} unidades disponiveis.`);
                    return;
                  }
                  setQuantity(quantity + 1);
                  setStockAlert("");
                }} className="px-3 py-2 hover:bg-secondary">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            {stockAlert && (
              <div className="flex items-center gap-1.5 text-xs text-warning">
                <AlertTriangle className="h-3.5 w-3.5" /> {stockAlert}
              </div>
            )}
          </div>

          {/* Shipping */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary mb-6">
            <Truck className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Entrega estimada</p>
              <p className="text-xs text-muted-foreground">2-5 dias úteis para Luanda</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              className="flex-1 bg-hero-gradient text-primary-foreground hover:opacity-90 gap-2"
              disabled={product.stock <= 0}
              onClick={() => {
                if (product.stock > 0 && quantity > product.stock) {
                  setStockAlert(`Apenas ${product.stock} unidades disponiveis.`);
                  setQuantity(product.stock);
                  return;
                }
                addItem(product, quantity, selectedVariants);
                setStockAlert("");
                toast.success(`"${product.name}" adicionado ao carrinho`);
              }}
            >
              <ShoppingCart className="h-4 w-4" /> {product.stock <= 0 ? "Esgotado" : "Adicionar ao Carrinho"}
            </Button>
            <Button
              variant="outline"
              onClick={() => toggleWishlist(product)}
              className={`gap-2 ${wishlisted ? "border-destructive text-destructive hover:bg-destructive/10" : ""}`}
            >
              <Heart className={`h-4 w-4 ${wishlisted ? "fill-destructive" : ""}`} />
              {wishlisted ? "Na Lista" : "Favorito"}
            </Button>
          </div>
          <div className="mt-3">
            <a
              href={`https://wa.me/${product.store.whatsapp.replace(/\+/g, "")}?text=${whatsAppMsg}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full"
            >
              <Button variant="outline" className="w-full gap-2 border-success text-success hover:bg-success/10">
                <MessageCircle className="h-4 w-4" /> Comprar via WhatsApp
              </Button>
            </a>
          </div>

          {/* Description */}
          <div className="mt-8 pt-6 border-t border-border">
            <h3 className="font-semibold mb-2">Descrição</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-12">
        <div className="rounded-2xl border border-border bg-card p-6">
          <ReviewSection
            type="product"
            targetId={product.id}
            targetName={product.name}
            averageRating={product.rating}
            totalReviews={product.reviewCount}
          />
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-bold mb-4">Produtos Relacionados</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {related.map((p) => (
              <div key={p.id}>
                <Link to={`/produto/${p.slug}`}>
                  <div className="aspect-square rounded-xl overflow-hidden bg-secondary mb-2">
                    <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover hover:scale-105 transition-transform" />
                  </div>
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-sm font-bold">{formatPrice(p.price)} Kz</p>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
};

export default ProductDetail;
