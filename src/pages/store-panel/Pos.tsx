import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import { useEffect, useState, useRef, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import {
  ShoppingCart, Search, Plus, Minus, Trash2, Loader2, CreditCard,
  Banknote, Receipt, Wifi, WifiOff, Package, X, Check, AlertTriangle,
  ChevronDown, ChevronUp, History, BarChart3, RefreshCw, Printer,
  User, Phone, FileText, Lock, ArrowUpRight
} from "lucide-react";
import { useToastNotification } from "@/contexts/ToastContext";
import Modal from "@/components/admin/Modal";

import { resolveStorageUrl } from "@/lib/imageHelpers";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";
const LS_PRODUCTS_KEY = "pos_products_";
const LS_CART_KEY = "pos_cart_";
const LS_OFFLINE_KEY = "pos_offline_sales_";

interface PosProduct {
  id: number; name: string; slug: string; price: string; original_price: string | null;
  stock: number; category: string | null;
  images: string[];
}

interface CartItem {
  product_id: number; name: string; price: number; qty: number; subtotal: number;
  stock: number; image: string | null;
}

interface OfflineSale {
  offline_id: string; items: CartItem[]; subtotal: number; discount: number;
  total: number; payment_method: string; amount_received: number;
  change_amount: number; customer_name: string; customer_phone: string;
  notes: string; created_at: string;
}

interface SaleRecord {
  id: number; sale_number: string; items: any[]; total: string; payment_method: string;
  customer_name: string | null; status: string; created_at: string;
}

interface PosStats {
  today: { count: number; total: number; cash: number; other: number };
  all_time: { count: number; total: number };
}

export default function StorePos() {
  const { token } = useAuth();
  const s = useAdminStyles();
  const toast = useToastNotification();
  const { slug } = useOutletContext<{ slug: string }>();
  const searchRef = useRef<HTMLInputElement>(null);

  // Access check
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [planName, setPlanName] = useState("");

  // Products
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [search, setSearch] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [payMethod, setPayMethod] = useState("cash");
  const [amountReceived, setAmountReceived] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [saleNotes, setSaleNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  // Online status
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);

  // Panels
  const [showHistory, setShowHistory] = useState(false);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [stats, setStats] = useState<PosStats | null>(null);
  const [loadingSales, setLoadingSales] = useState(false);

  // Receipt modal
  const [receiptSale, setReceiptSale] = useState<any>(null);

  const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };

  // ─── Online/Offline detection ───
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // ─── Check POS access ───
  useEffect(() => {
    if (!token || !slug) return;
    fetch(`${API}/store-panel/${slug}/pos/check`, { headers })
      .then((r) => r.json())
      .then((d) => { setHasAccess(d.has_pos); setPlanName(d.plan_name || ""); })
      .catch(() => setHasAccess(false));
  }, [token, slug]);

  // ─── Load products (online or from cache) ───
  const loadProducts = useCallback(() => {
    const cacheKey = LS_PRODUCTS_KEY + slug;
    // Try online first
    if (isOnline && token) {
      setLoadingProducts(true);
      fetch(`${API}/store-panel/${slug}/pos/products`, { headers })
        .then((r) => r.json())
        .then((d) => {
          setProducts(d.products || []);
          localStorage.setItem(cacheKey, JSON.stringify(d.products || []));
        })
        .catch(() => {
          // Fallback to cache
          const cached = localStorage.getItem(cacheKey);
          if (cached) setProducts(JSON.parse(cached));
        })
        .finally(() => setLoadingProducts(false));
    } else {
      // Offline — load from cache
      const cached = localStorage.getItem(cacheKey);
      if (cached) setProducts(JSON.parse(cached));
      setLoadingProducts(false);
    }
  }, [slug, token, isOnline]);

  useEffect(() => {
    if (hasAccess) loadProducts();
  }, [hasAccess, loadProducts]);

  // ─── Load cart from localStorage ───
  useEffect(() => {
    const saved = localStorage.getItem(LS_CART_KEY + slug);
    if (saved) { try { setCart(JSON.parse(saved)); } catch {} }
  }, [slug]);

  // ─── Persist cart ───
  useEffect(() => {
    localStorage.setItem(LS_CART_KEY + slug, JSON.stringify(cart));
  }, [cart, slug]);

  // ─── Offline sales count ───
  useEffect(() => {
    const saved = localStorage.getItem(LS_OFFLINE_KEY + slug);
    if (saved) { try { setOfflineCount(JSON.parse(saved).length); } catch {} }
  }, [slug]);

  // ─── Auto-sync when back online ───
  useEffect(() => {
    if (isOnline && offlineCount > 0) syncOfflineSales();
  }, [isOnline]);

  // ─── Filter products ───
  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(search.toLowerCase()))
  );

  // ─── Cart helpers ───
  const getPrice = (p: PosProduct) => {
    const orig = p.original_price ? parseFloat(p.original_price) : 0;
    const price = parseFloat(p.price);
    return orig > 0 && orig < price ? orig : price;
  };

  const addToCart = (p: PosProduct) => {
    const price = getPrice(p);
    const img = p.images?.[0] ? resolveStorageUrl(p.images[0]) : null;
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.product_id === p.id);
      if (idx >= 0) {
        const updated = [...prev];
        if (updated[idx].qty < p.stock) {
          updated[idx].qty += 1;
          updated[idx].subtotal = updated[idx].qty * updated[idx].price;
        }
        return updated;
      }
      return [...prev, { product_id: p.id, name: p.name, price, qty: 1, subtotal: price, stock: p.stock, image: img }];
    });
  };

  const updateQty = (productId: number, delta: number) => {
    setCart((prev) => prev.map((c) => {
      if (c.product_id !== productId) return c;
      const newQty = Math.max(1, Math.min(c.stock, c.qty + delta));
      return { ...c, qty: newQty, subtotal: newQty * c.price };
    }));
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((c) => c.product_id !== productId));
  };

  const clearCart = () => { setCart([]); setDiscount(0); setAmountReceived(""); setCustomerName(""); setCustomerPhone(""); setSaleNotes(""); };

  const subtotal = cart.reduce((s, c) => s + c.subtotal, 0);
  const total = Math.max(0, subtotal - discount);
  const received = parseFloat(amountReceived) || 0;
  const change = Math.max(0, received - total);

  // ─── Process sale ───
  const processSale = async () => {
    if (cart.length === 0) return;
    const saleData: OfflineSale = {
      offline_id: `${slug}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      items: cart.map(({ image, stock, ...rest }) => rest) as any,
      subtotal, discount, total,
      payment_method: payMethod,
      amount_received: received || total,
      change_amount: change,
      customer_name: customerName, customer_phone: customerPhone,
      notes: saleNotes, created_at: new Date().toISOString(),
    };

    if (isOnline) {
      setProcessing(true);
      try {
        const res = await fetch(`${API}/store-panel/${slug}/pos/sell`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(saleData),
        });
        const d = await res.json();
        if (res.ok) {
          toast.success("Venda registada", d.sale?.sale_number || "");
          setReceiptSale({ ...saleData, sale_number: d.sale?.sale_number });
          clearCart();
          loadProducts(); // refresh stock
        } else {
          toast.error("Erro", d.message || "Erro ao registar venda.");
        }
      } catch {
        // Save offline
        saveOffline(saleData);
        toast.info("Offline", "Venda guardada localmente. Sera sincronizada.");
        clearCart();
      } finally { setProcessing(false); }
    } else {
      saveOffline(saleData);
      toast.info("Modo Offline", "Venda guardada. Sincronizara automaticamente.");
      setReceiptSale({ ...saleData, sale_number: `OFF-${saleData.offline_id.slice(-6).toUpperCase()}` });
      clearCart();
    }
  };

  const saveOffline = (sale: OfflineSale) => {
    const key = LS_OFFLINE_KEY + slug;
    const existing: OfflineSale[] = JSON.parse(localStorage.getItem(key) || "[]");
    existing.push(sale);
    localStorage.setItem(key, JSON.stringify(existing));
    setOfflineCount(existing.length);
  };

  const syncOfflineSales = async () => {
    const key = LS_OFFLINE_KEY + slug;
    const pending: OfflineSale[] = JSON.parse(localStorage.getItem(key) || "[]");
    if (pending.length === 0) return;

    setSyncing(true);
    try {
      const res = await fetch(`${API}/store-panel/${slug}/pos/sync`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ sales: pending }),
      });
      const d = await res.json();
      if (res.ok) {
        localStorage.removeItem(key);
        setOfflineCount(0);
        toast.success("Sincronizado", d.message);
        loadProducts();
      }
    } catch {} finally { setSyncing(false); }
  };

  // ─── Sales history & stats ───
  const loadSales = () => {
    setLoadingSales(true);
    fetch(`${API}/store-panel/${slug}/pos/sales?per_page=30`, { headers })
      .then((r) => r.json())
      .then((d) => setSales(d.data || []))
      .finally(() => setLoadingSales(false));
  };

  const loadStats = () => {
    fetch(`${API}/store-panel/${slug}/pos/stats`, { headers })
      .then((r) => r.json())
      .then(setStats);
  };

  useEffect(() => {
    if (showHistory && hasAccess && isOnline) { loadSales(); loadStats(); }
  }, [showHistory]);

  const voidSale = async (id: number) => {
    if (!confirm("Anular esta venda? O stock sera reposto.")) return;
    const res = await fetch(`${API}/store-panel/${slug}/pos/sales/${id}/void`, { method: "POST", headers });
    const d = await res.json();
    if (res.ok) { toast.success("Anulada", d.message); loadSales(); loadStats(); loadProducts(); }
    else toast.error("Erro", d.message || "Erro.");
  };

  const formatPrice = (p: number) => new Intl.NumberFormat("pt-AO", { minimumFractionDigits: 0 }).format(p) + " Kz";
  const fmtDate = (d: string) => new Date(d).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  // ─── Access gate ───
  if (hasAccess === null) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-orange-500" /></div>;

  if (!hasAccess) {
    return (
      <div className={`rounded-2xl border ${s.card} py-16 text-center`}>
        <Lock className={`h-12 w-12 ${s.empty} mx-auto mb-3`} />
        <h3 className={`text-lg font-bold ${s.textPrimary} mb-2`}>POS nao disponivel</h3>
        <p className={`text-sm ${s.textMuted} mb-1`}>O plano <strong>{planName || "actual"}</strong> nao inclui acesso ao POS.</p>
        <p className={`text-xs ${s.textMuted} mb-4`}>Faca upgrade para um plano com POS incluido.</p>
        <a href={`/loja/${slug}/painel/subscricao`}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold ${s.btnPrimary} shadow-sm`}>
          <ArrowUpRight className="h-4 w-4" /> Ver Planos
        </a>
      </div>
    );
  }

  // ─── MAIN POS INTERFACE ───
  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-8rem)]">
      {/* ─── LEFT: Product grid ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${s.textMuted}`} />
            <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar produto ou categoria..."
              className={`w-full pl-10 pr-4 py-2.5 ${s.input} border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20`} />
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold ${isOnline ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
            {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {isOnline ? "Online" : "Offline"}
          </div>
          {offlineCount > 0 && (
            <button onClick={syncOfflineSales} disabled={!isOnline || syncing}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold bg-amber-50 text-amber-600 disabled:opacity-50`}>
              {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {offlineCount} pendente{offlineCount > 1 ? "s" : ""}
            </button>
          )}
          <button onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold ${s.btnSecondary}`}>
            <History className="h-3.5 w-3.5" /> Historico
          </button>
          <button onClick={() => { loadProducts(); toast.success("Actualizado"); }}
            className={`p-2 rounded-xl ${s.btnSecondary}`} title="Recarregar produtos">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* History panel */}
        {showHistory && (
          <div className={`mb-3 rounded-2xl border ${s.card} p-4 space-y-3 max-h-80 overflow-y-auto`}>
            <div className="flex items-center justify-between">
              <h4 className={`text-sm font-bold ${s.textPrimary}`}>Vendas de Hoje</h4>
              <button onClick={() => setShowHistory(false)} className={s.textMuted}><X className="h-4 w-4" /></button>
            </div>
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: "Vendas", value: stats.today.count, icon: Receipt },
                  { label: "Total", value: formatPrice(stats.today.total), icon: Banknote },
                  { label: "Cash", value: formatPrice(stats.today.cash), icon: Banknote },
                  { label: "Todas", value: `${stats.all_time.count} (${formatPrice(stats.all_time.total)})`, icon: BarChart3 },
                ].map((st) => (
                  <div key={st.label} className={`p-2 rounded-xl border ${s.borderLight} text-center`}>
                    <st.icon className={`h-3.5 w-3.5 text-orange-500 mx-auto mb-0.5`} />
                    <p className={`text-xs font-bold ${s.textPrimary}`}>{st.value}</p>
                    <p className={`text-[9px] ${s.textMuted}`}>{st.label}</p>
                  </div>
                ))}
              </div>
            )}
            {loadingSales ? <Loader2 className="h-4 w-4 animate-spin text-orange-500 mx-auto" /> : sales.length === 0 ? (
              <p className={`text-xs ${s.textMuted} text-center`}>Nenhuma venda.</p>
            ) : (
              <div className={`divide-y ${s.borderLight}`}>
                {sales.map((sl) => (
                  <div key={sl.id} className="flex items-center gap-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${s.textPrimary}`}>{sl.sale_number}</p>
                      <p className={`text-[10px] ${s.textMuted}`}>{fmtDate(sl.created_at)} • {sl.payment_method} {sl.customer_name ? `• ${sl.customer_name}` : ""}</p>
                    </div>
                    <span className={`text-xs font-bold ${sl.status === "voided" ? "line-through text-red-400" : s.textPrimary}`}>
                      {formatPrice(parseFloat(sl.total))}
                    </span>
                    {sl.status === "completed" && (
                      <button onClick={() => voidSale(sl.id)} className="text-red-400 hover:text-red-600 p-1" title="Anular">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Products grid */}
        {loadingProducts ? (
          <div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-orange-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Package className={`h-10 w-10 ${s.empty} mx-auto mb-2`} />
              <p className={`text-sm ${s.textMuted}`}>{search ? "Nenhum resultado" : "Sem produtos"}</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2 content-start">
            {filtered.map((p) => {
              const price = getPrice(p);
              const inCart = cart.find((c) => c.product_id === p.id);
              const imgSrc = p.images?.[0] ? resolveStorageUrl(p.images[0]) : null;
              return (
                <button key={p.id} onClick={() => addToCart(p)} disabled={p.stock <= 0}
                  className={`rounded-xl border ${s.card} overflow-hidden text-left transition-all hover:shadow-md disabled:opacity-40 relative group`}>
                  {inCart && (
                    <div className="absolute top-1.5 right-1.5 z-10 h-5 w-5 rounded-full bg-orange-500 text-white text-[9px] font-bold flex items-center justify-center shadow">
                      {inCart.qty}
                    </div>
                  )}
                  <div className={`aspect-square ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"} flex items-center justify-center overflow-hidden`}>
                    {imgSrc ? (
                      <img src={imgSrc} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <Package className={`h-8 w-8 ${s.empty}`} />
                    )}
                  </div>
                  <div className="p-2">
                    <p className={`text-[10px] font-semibold ${s.textPrimary} truncate`}>{p.name}</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs font-bold text-orange-500">{formatPrice(price)}</span>
                      <span className={`text-[9px] ${p.stock <= 3 ? "text-red-500" : s.textMuted}`}>{p.stock} un</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── RIGHT: Cart ─── */}
      <div className={`w-full lg:w-96 flex flex-col rounded-2xl border ${s.card} overflow-hidden`}>
        <div className={`px-4 py-3 border-b ${s.borderLight} flex items-center justify-between`}>
          <span className={`flex items-center gap-2 text-sm font-bold ${s.textPrimary}`}>
            <ShoppingCart className="h-4 w-4 text-orange-500" /> Carrinho
            {cart.length > 0 && <span className="text-[10px] text-orange-500">({cart.reduce((s, c) => s + c.qty, 0)})</span>}
          </span>
          {cart.length > 0 && (
            <button onClick={clearCart} className={`text-[10px] ${s.textMuted} hover:text-red-500`}>Limpar</button>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <ShoppingCart className={`h-8 w-8 ${s.empty} mb-2`} />
              <p className={`text-xs ${s.textMuted}`}>Carrinho vazio</p>
              <p className={`text-[10px] ${s.textMuted}`}>Clique nos produtos para adicionar</p>
            </div>
          ) : cart.map((item) => (
            <div key={item.product_id} className={`flex items-center gap-2 p-2 rounded-xl ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}>
              <div className="flex-1 min-w-0">
                <p className={`text-[11px] font-semibold ${s.textPrimary} truncate`}>{item.name}</p>
                <p className={`text-[10px] ${s.textMuted}`}>{formatPrice(item.price)} x {item.qty}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => updateQty(item.product_id, -1)}
                  className={`h-6 w-6 rounded-lg ${s.isDark ? "bg-white/[0.06]" : "bg-gray-200"} flex items-center justify-center`}>
                  <Minus className="h-3 w-3" />
                </button>
                <span className={`text-xs font-bold w-6 text-center ${s.textPrimary}`}>{item.qty}</span>
                <button onClick={() => updateQty(item.product_id, 1)}
                  className={`h-6 w-6 rounded-lg ${s.isDark ? "bg-white/[0.06]" : "bg-gray-200"} flex items-center justify-center`}>
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              <span className={`text-xs font-bold ${s.textPrimary} w-20 text-right`}>{formatPrice(item.subtotal)}</span>
              <button onClick={() => removeFromCart(item.product_id)} className="text-red-400 hover:text-red-600 p-0.5">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Cart footer */}
        {cart.length > 0 && (
          <div className={`border-t ${s.borderLight} p-3 space-y-3`}>
            {/* Customer info (collapsible) */}
            <details className="group">
              <summary className={`flex items-center gap-1.5 text-[10px] font-medium ${s.textMuted} cursor-pointer`}>
                <User className="h-3 w-3" /> Cliente (opcional)
                <ChevronDown className="h-3 w-3 group-open:hidden" />
                <ChevronUp className="h-3 w-3 hidden group-open:block" />
              </summary>
              <div className="mt-2 space-y-1.5">
                <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nome"
                  className={`w-full ${s.input} border rounded-lg px-2.5 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-orange-500/20`} />
                <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Telefone"
                  className={`w-full ${s.input} border rounded-lg px-2.5 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-orange-500/20`} />
                <input value={saleNotes} onChange={(e) => setSaleNotes(e.target.value)} placeholder="Notas"
                  className={`w-full ${s.input} border rounded-lg px-2.5 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-orange-500/20`} />
              </div>
            </details>

            {/* Discount */}
            <div className="flex items-center gap-2">
              <span className={`text-[10px] ${s.textMuted} shrink-0`}>Desconto:</span>
              <input type="number" value={discount || ""} onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="0" className={`flex-1 ${s.input} border rounded-lg px-2 py-1.5 text-[11px] text-right focus:outline-none focus:ring-1 focus:ring-orange-500/20`} />
              <span className={`text-[10px] ${s.textMuted}`}>Kz</span>
            </div>

            {/* Totals */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className={`text-[10px] ${s.textMuted}`}>Subtotal</span>
                <span className={`text-xs ${s.textSecondary}`}>{formatPrice(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between">
                  <span className={`text-[10px] text-red-500`}>Desconto</span>
                  <span className="text-xs text-red-500">-{formatPrice(discount)}</span>
                </div>
              )}
              <div className={`flex justify-between pt-1 border-t ${s.borderLight}`}>
                <span className={`text-sm font-bold ${s.textPrimary}`}>Total</span>
                <span className="text-lg font-extrabold text-orange-500">{formatPrice(total)}</span>
              </div>
            </div>

            {/* Payment method */}
            <div className="flex gap-1.5">
              {[
                { val: "cash", label: "Cash", icon: Banknote },
                { val: "multicaixa", label: "Multicaixa", icon: CreditCard },
                { val: "transferencia", label: "Transf.", icon: CreditCard },
              ].map((pm) => (
                <button key={pm.val} onClick={() => setPayMethod(pm.val)}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-semibold transition-colors ${
                    payMethod === pm.val ? "bg-orange-500 text-white" : `${s.isDark ? "bg-white/[0.04]" : "bg-gray-100"} ${s.textMuted}`
                  }`}>
                  <pm.icon className="h-3 w-3" /> {pm.label}
                </button>
              ))}
            </div>

            {/* Amount received (for cash) */}
            {payMethod === "cash" && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] ${s.textMuted} shrink-0`}>Recebido:</span>
                  <input type="number" value={amountReceived} onChange={(e) => setAmountReceived(e.target.value)}
                    placeholder={String(total)} className={`flex-1 ${s.input} border rounded-lg px-2 py-1.5 text-[11px] text-right focus:outline-none focus:ring-1 focus:ring-orange-500/20`} />
                  <span className={`text-[10px] ${s.textMuted}`}>Kz</span>
                </div>
                {received > 0 && received >= total && (
                  <div className="flex justify-between">
                    <span className={`text-[10px] font-medium text-emerald-500`}>Troco</span>
                    <span className="text-sm font-bold text-emerald-500">{formatPrice(change)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Sell button */}
            <button onClick={processSale} disabled={processing || cart.length === 0}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold ${s.btnPrimary} shadow-lg disabled:opacity-50 transition-all`}>
              {processing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Receipt className="h-5 w-5" />}
              {isOnline ? "Finalizar Venda" : "Guardar Offline"}
            </button>
          </div>
        )}
      </div>

      {/* ─── Receipt Modal ─── */}
      <Modal open={!!receiptSale} onClose={() => setReceiptSale(null)} title="Recibo" size="sm">
        {receiptSale && (
          <div className="space-y-3">
            <div className="text-center">
              <Check className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
              <p className={`text-lg font-extrabold ${s.textPrimary}`}>Venda Concluida!</p>
              <p className={`text-xs ${s.textMuted}`}>{receiptSale.sale_number}</p>
            </div>
            <div className={`rounded-xl p-3 space-y-1.5 ${s.isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}>
              {receiptSale.items?.map((item: any, i: number) => (
                <div key={i} className="flex justify-between text-[11px]">
                  <span className={s.textSecondary}>{item.qty}x {item.name}</span>
                  <span className={`font-medium ${s.textPrimary}`}>{formatPrice(item.subtotal)}</span>
                </div>
              ))}
              <div className={`flex justify-between pt-1.5 border-t ${s.borderLight} text-sm font-bold`}>
                <span className={s.textPrimary}>Total</span>
                <span className="text-orange-500">{formatPrice(receiptSale.total)}</span>
              </div>
              {receiptSale.change_amount > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-500">Troco</span>
                  <span className="font-bold text-emerald-500">{formatPrice(receiptSale.change_amount)}</span>
                </div>
              )}
            </div>
            <button onClick={() => setReceiptSale(null)}
              className={`w-full py-2.5 rounded-xl text-xs font-semibold ${s.btnPrimary}`}>
              Fechar
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
