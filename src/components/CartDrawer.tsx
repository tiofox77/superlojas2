import { X, Minus, Plus, Trash2, MessageCircle } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { logoSrc, productImgSrc, onImgError } from "@/lib/imageHelpers";

export function CartDrawer() {
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, totalPrice, clearCart } = useCart();

  const formatPrice = (val: number) => new Intl.NumberFormat("pt-AO").format(val);

  // Group items by store
  const byStore = items.reduce((acc, item) => {
    const sid = item.product.store.id;
    if (!acc[sid]) acc[sid] = { store: item.product.store, items: [] };
    acc[sid].items.push(item);
    return acc;
  }, {} as Record<string, { store: typeof items[0]["product"]["store"]; items: typeof items }>);

  const generateWhatsAppMessage = (storeName: string, storeItems: typeof items) => {
    let msg = `Olá, quero comprar:\n\n`;
    let total = 0;
    storeItems.forEach((item) => {
      const subtotal = item.product.price * item.quantity;
      total += subtotal;
      const variants = Object.entries(item.selectedVariants).map(([k, v]) => `${k}: ${v}`).join(", ");
      msg += `• ${item.product.name}${variants ? ` (${variants})` : ""} x${item.quantity} — ${formatPrice(subtotal)} Kz\n`;
    });
    msg += `\nTotal: ${formatPrice(total)} Kz\n\nEnviado via SuperLojas`;
    return encodeURIComponent(msg);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
      <div className="relative w-full max-w-md bg-card border-l border-border h-full animate-slide-in flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-bold text-lg">Carrinho ({items.length})</h2>
          <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <p>Seu carrinho está vazio</p>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Continuar comprando</Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {Object.values(byStore).map(({ store, items: storeItems }) => (
                <div key={store.id}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <img src={logoSrc(store.logo, store.name)} alt={store.name} className="h-6 w-6 rounded" onError={onImgError("logo", store.name)} />
                      <span className="text-sm font-semibold">{store.name}</span>
                    </div>
                    <a
                      href={`https://wa.me/${store.whatsapp.replace(/\+/g, "")}?text=${generateWhatsAppMessage(store.name, storeItems)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] font-medium text-success hover:underline"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                    </a>
                  </div>
                  <div className="space-y-3">
                    {storeItems.map((item) => (
                      <div key={item.product.id} className="flex gap-3 p-2 rounded-lg bg-secondary/50">
                        <img src={item.product.images[0]} alt={item.product.name} className="h-16 w-16 rounded-lg object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.product.name}</p>
                          <p className="text-xs text-muted-foreground">{formatPrice(item.product.price)} Kz</p>
                          <div className="flex items-center gap-2 mt-1">
                            <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="h-6 w-6 rounded bg-secondary flex items-center justify-center hover:bg-border">
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="h-6 w-6 rounded bg-secondary flex items-center justify-center hover:bg-border">
                              <Plus className="h-3 w-3" />
                            </button>
                            <button onClick={() => removeItem(item.product.id)} className="ml-auto text-destructive hover:text-destructive/80">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border p-4 space-y-3">
              <div className="flex items-center justify-between font-bold">
                <span>Total</span>
                <span>{formatPrice(totalPrice)} Kz</span>
              </div>
              <Link to="/carrinho" onClick={() => setIsOpen(false)}>
                <Button className="w-full bg-hero-gradient text-primary-foreground hover:opacity-90">
                  Finalizar Compra
                </Button>
              </Link>
              <button onClick={clearCart} className="w-full text-xs text-muted-foreground hover:text-destructive transition-colors">
                Limpar carrinho
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
