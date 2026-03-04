import { useParams, Link } from "react-router-dom";
import { useProduct, useProducts } from "@/hooks/useApi";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { Star, ShoppingCart, MessageCircle, ChevronRight, Minus, Plus, Truck, Heart, AlertTriangle, Clock, PackageCheck, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { ReviewSection } from "@/components/ReviewSection";
import { toast } from "sonner";
import { productImgSrc } from "@/lib/imageHelpers";
import ProductSeoHead from "@/components/ProductSeoHead";

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
  const [variantAlert, setVariantAlert] = useState("");
  const [countdown, setCountdown] = useState("");
  const [saleActive, setSaleActive] = useState(false);

  // Pre-order state
  const [preOrderOpen, setPreOrderOpen] = useState(false);
  const [preOrderForm, setPreOrderForm] = useState({ name: "", email: "", phone: "", province: "", notes: "" });
  const [preOrderSending, setPreOrderSending] = useState(false);
  const [preOrderError, setPreOrderError] = useState("");

  const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";
  const provinces = ["Bengo","Benguela","Bie","Cabinda","Cuando Cubango","Cuanza Norte","Cuanza Sul","Cunene","Huambo","Huila","Icolo e Bengo","Luanda","Lunda Norte","Lunda Sul","Malanje","Moxico","Namibe","Uige","Zaire"];

  const openPreOrder = () => {
    const missing = product?.variants.filter(v => !selectedVariants[v.type]).map(v => v.type) || [];
    if (missing.length > 0) { setVariantAlert(`Selecione: ${missing.join(", ")}`); return; }
    setPreOrderError(""); setPreOrderOpen(true);
  };

  const submitPreOrder = async () => {
    if (!product) return;
    if (!preOrderForm.name || !preOrderForm.email || !preOrderForm.phone || !preOrderForm.province) {
      setPreOrderError("Preencha todos os campos obrigatorios."); return;
    }
    setPreOrderSending(true); setPreOrderError("");
    try {
      const res = await fetch(`${API}/pre-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          product_id: Number(product.id),
          quantity,
          selected_variants: Object.keys(selectedVariants).length > 0 ? selectedVariants : null,
          customer: preOrderForm,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || "Encomenda registada!");
        setPreOrderOpen(false);
        setPreOrderForm({ name: "", email: "", phone: "", province: "", notes: "" });
      } else {
        setPreOrderError(data.message || data.error || "Erro ao enviar encomenda.");
      }
    } catch { setPreOrderError("Erro de conexao. Tente novamente."); }
    finally { setPreOrderSending(false); }
  };

  // Flash sale countdown
  useEffect(() => {
    if (!product?.flashSaleEnd) { setSaleActive(!!product?.badge && product.badge === "Promo"); return; }
    const end = new Date(product.flashSaleEnd).getTime();
    const start = product.flashSaleStart ? new Date(product.flashSaleStart).getTime() : 0;
    const tick = () => {
      const now = Date.now();
      if (start && now < start) { setSaleActive(false); setCountdown("Em breve"); return; }
      const diff = end - now;
      if (diff <= 0) { setSaleActive(false); setCountdown("Terminado"); return; }
      setSaleActive(true);
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const sec = Math.floor((diff % 60000) / 1000);
      setCountdown(`${d > 0 ? d + "d " : ""}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [product?.flashSaleEnd, product?.flashSaleStart, product?.badge]);

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
      <ProductSeoHead
        productName={product.name}
        productSlug={product.slug}
        productDescription={product.description}
        productImage={product.images[0]}
        productPrice={product.price}
        storeName={product.store.name}
        category={product.category}
      />
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
            <img src={productImgSrc(product.images[selectedImage])} alt={product.name} className="h-full w-full object-cover" />
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
                  <img src={productImgSrc(img)} alt={`${product.name} ${i + 1}`} className="h-full w-full object-cover" />
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

          {/* Flash Sale Countdown */}
          {product.badge === "Promo" && countdown && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-4 ${saleActive ? "bg-destructive/10 border border-destructive/20" : "bg-muted border border-border"}`}>
              <Clock className={`h-4 w-4 ${saleActive ? "text-destructive" : "text-muted-foreground"}`} />
              <span className={`text-xs font-bold ${saleActive ? "text-destructive" : "text-muted-foreground"}`}>
                {saleActive ? "Flash Sale termina em:" : countdown === "Terminado" ? "Flash Sale terminada" : "Flash Sale começa em breve"}
              </span>
              {saleActive && (
                <span className="text-sm font-mono font-extrabold text-destructive ml-auto">{countdown}</span>
              )}
            </div>
          )}

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
          {product.variants.length > 0 && (
            <div className="mb-2">
              {product.variants.map((v) => (
                <div key={v.type} className="mb-4">
                  <p className="text-sm font-medium mb-2">{v.type} {!selectedVariants[v.type] && <span className="text-xs text-muted-foreground">(selecione)</span>}</p>
                  <div className="flex flex-wrap gap-2">
                    {v.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => { setSelectedVariants((prev) => ({ ...prev, [v.type]: opt })); setVariantAlert(""); }}
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
              {variantAlert && (
                <div className="flex items-center gap-1.5 text-xs text-destructive mb-2">
                  <AlertTriangle className="h-3.5 w-3.5" /> {variantAlert}
                </div>
              )}
            </div>
          )}

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
            {product.stock > 0 ? (
              <Button
                className="flex-1 bg-hero-gradient text-primary-foreground hover:opacity-90 gap-2"
                onClick={() => {
                  const missing = product.variants.filter(v => !selectedVariants[v.type]).map(v => v.type);
                  if (missing.length > 0) { setVariantAlert(`Selecione: ${missing.join(", ")}`); return; }
                  if (quantity > product.stock) { setStockAlert(`Apenas ${product.stock} unidades disponiveis.`); setQuantity(product.stock); return; }
                  addItem(product, quantity, selectedVariants);
                  setStockAlert(""); setVariantAlert("");
                  toast.success(`"${product.name}" adicionado ao carrinho`);
                }}
              >
                <ShoppingCart className="h-4 w-4" /> Adicionar ao Carrinho
              </Button>
            ) : (
              <Button
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white gap-2"
                onClick={openPreOrder}
              >
                <PackageCheck className="h-4 w-4" /> Encomendar
              </Button>
            )}
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
                    <img src={productImgSrc(p.images[0])} alt={p.name} className="h-full w-full object-cover hover:scale-105 transition-transform" />
                  </div>
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-sm font-bold">{formatPrice(p.price)} Kz</p>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pre-order Modal */}
      {preOrderOpen && product && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPreOrderOpen(false)} />
          <div className="relative w-full max-w-md bg-card rounded-2xl shadow-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-purple-50 dark:bg-purple-500/10">
              <div className="flex items-center gap-2">
                <PackageCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <h3 className="text-sm font-bold text-foreground">Encomendar Produto</h3>
              </div>
              <button onClick={() => setPreOrderOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Product summary */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary">
                <img src={productImgSrc(product.images[0])} alt="" className="h-12 w-12 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {quantity}x — {formatPrice(product.price * quantity)} Kz
                    {Object.entries(selectedVariants).length > 0 && (
                      <span> · {Object.entries(selectedVariants).map(([k, v]) => `${k}: ${v}`).join(", ")}</span>
                    )}
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Este produto esta esgotado. Preencha os seus dados para registar uma encomenda. A loja entrara em contacto consigo quando estiver disponivel.
              </p>

              {preOrderError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">{preOrderError}</div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Nome completo <span className="text-destructive">*</span></label>
                  <input type="text" value={preOrderForm.name} onChange={(e) => setPreOrderForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="O seu nome"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Email <span className="text-destructive">*</span></label>
                  <input type="email" value={preOrderForm.email} onChange={(e) => setPreOrderForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="email@exemplo.com"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Telefone <span className="text-destructive">*</span></label>
                  <input type="tel" value={preOrderForm.phone} onChange={(e) => setPreOrderForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+244 9XX XXX XXX"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Provincia <span className="text-destructive">*</span></label>
                  <select value={preOrderForm.province} onChange={(e) => setPreOrderForm(f => ({ ...f, province: e.target.value }))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20">
                    <option value="">Selecionar provincia...</option>
                    {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Notas (opcional)</label>
                  <textarea value={preOrderForm.notes} onChange={(e) => setPreOrderForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Alguma observacao..."
                    rows={2}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-none" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setPreOrderOpen(false)} className="flex-1">Cancelar</Button>
                <Button
                  onClick={submitPreOrder}
                  disabled={preOrderSending}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white gap-2"
                >
                  {preOrderSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
                  {preOrderSending ? "A enviar..." : "Confirmar Encomenda"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default ProductDetail;
