import { useCart } from "@/contexts/CartContext";
import { Link } from "react-router-dom";
import { Minus, Plus, Trash2, MessageCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoSrc, productImgSrc, onImgError } from "@/lib/imageHelpers";

const Cart = () => {
  const { items, removeItem, updateQuantity, totalPrice, clearCart } = useCart();
  const formatPrice = (val: number) => new Intl.NumberFormat("pt-AO").format(val);

  const byStore = items.reduce((acc, item) => {
    const sid = item.product.store.id;
    if (!acc[sid]) acc[sid] = { store: item.product.store, items: [] };
    acc[sid].items.push(item);
    return acc;
  }, {} as Record<string, { store: typeof items[0]["product"]["store"]; items: typeof items }>);

  const generateWhatsAppMessage = (storeItems: typeof items) => {
    let msg = `Olá, quero comprar:\n\n`;
    let total = 0;
    storeItems.forEach((item) => {
      const subtotal = item.product.price * item.quantity;
      total += subtotal;
      msg += `• ${item.product.name} x${item.quantity} — ${formatPrice(subtotal)} Kz\n`;
    });
    msg += `\nTotal: ${formatPrice(total)} Kz\n\nEnviado via SuperLojas`;
    return encodeURIComponent(msg);
  };

  if (items.length === 0) {
    return (
      <main className="container py-16 text-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Carrinho Vazio</h1>
        <p className="text-muted-foreground mb-6">Adicione produtos para continuar.</p>
        <Link to="/"><Button>Explorar Produtos</Button></Link>
      </main>
    );
  }

  return (
    <main className="container py-8 min-h-screen">
      <Link to="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Continuar comprando
      </Link>
      <h1 className="text-2xl font-bold mb-8">Carrinho</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {Object.values(byStore).map(({ store, items: storeItems }) => (
            <div key={store.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
                <img src={logoSrc(store.logo, store.name)} alt={store.name} className="h-8 w-8 rounded-lg" onError={onImgError("logo", store.name)} />
                <span className="font-semibold">{store.name}</span>
              </div>
              <div className="space-y-4">
                {storeItems.map((item) => (
                  <div key={item.product.id} className="flex gap-4">
                    <img src={item.product.images[0]} alt={item.product.name} className="h-20 w-20 rounded-lg object-cover" />
                    <div className="flex-1">
                      <Link to={`/produto/${item.product.slug}`} className="text-sm font-medium hover:text-primary">
                        {item.product.name}
                      </Link>
                      <p className="text-sm font-bold mt-1">{formatPrice(item.product.price)} Kz</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center border border-border rounded-lg">
                          <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="px-2 py-1 hover:bg-secondary"><Minus className="h-3 w-3" /></button>
                          <span className="px-3 py-1 text-sm border-x border-border">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="px-2 py-1 hover:bg-secondary"><Plus className="h-3 w-3" /></button>
                        </div>
                        <button onClick={() => removeItem(item.product.id)} className="text-destructive hover:text-destructive/80">
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <span className="ml-auto font-semibold text-sm">{formatPrice(item.product.price * item.quantity)} Kz</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* WhatsApp for this store */}
              <a
                href={`https://wa.me/${store.whatsapp.replace(/\+/g, "")}?text=${generateWhatsAppMessage(storeItems)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-success text-success text-sm font-medium hover:bg-success/10 transition-colors"
              >
                <MessageCircle className="h-4 w-4" /> Comprar via WhatsApp
              </a>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-border bg-card p-6 sticky top-24">
            <h3 className="font-bold mb-4">Resumo</h3>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(totalPrice)} Kz</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Entrega</span><span>A calcular</span></div>
            </div>
            <div className="border-t border-border pt-3 mb-4">
              <div className="flex justify-between font-bold text-lg"><span>Total</span><span>{formatPrice(totalPrice)} Kz</span></div>
            </div>
            <Link to="/checkout">
              <Button className="w-full bg-hero-gradient text-primary-foreground hover:opacity-90 mb-2">
                Finalizar Compra
              </Button>
            </Link>
            <button onClick={clearCart} className="w-full text-xs text-muted-foreground hover:text-destructive transition-colors mt-2">
              Limpar carrinho
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Cart;
