import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { CartItem, Product } from "@/data/types";
import { transformProduct } from "@/services/transformers";
import { trackInterest } from "@/lib/demand";

/** Same product with different variants = different cart line. */
export const cartItemKey = (productId: string, variants: Record<string, string> = {}) =>
  productId + JSON.stringify(Object.entries(variants).sort(([a], [b]) => a.localeCompare(b)));

const CART_KEY = "superlojas_cart";

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Drop malformed lines left by older versions of the cart.
      return Array.isArray(parsed)
        ? parsed
            .filter(
              (i) =>
                i?.product?.id &&
                i.product.store?.id &&
                Number.isFinite(i.product.price) &&
                Number.isInteger(i.quantity) &&
                i.quantity > 0
            )
            .map((i) => ({
              ...i,
              selectedVariants: i.selectedVariants && typeof i.selectedVariants === "object" ? i.selectedVariants : {},
            }))
        : [];
    }
  } catch {}
  return [];
}

function saveCart(items: CartItem[]) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {}
}

interface CartContextType {
  items: CartItem[];
  /** Returns how many units were actually added (0 when the stock limit was already reached). */
  addItem: (product: Product, quantity: number, variants: Record<string, string>) => number;
  removeItem: (productId: string, variants?: Record<string, string>) => void;
  updateQuantity: (productId: string, quantity: number, variants?: Record<string, string>) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const [isOpen, setIsOpen] = useState(false);

  // Refresh price/stock/store of the saved items (the cart may be days old).
  useEffect(() => {
    const slugs = [...new Set(items.map((i) => i.product.slug).filter(Boolean))];
    if (slugs.length === 0) return;
    let cancelled = false;
    Promise.allSettled(
      slugs.map(async (slug) => {
        const res = await fetch(`/api/products/${encodeURIComponent(slug)}`, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`Produto ${slug} indisponível`);
        return transformProduct(await res.json());
      })
    )
      .then((results) => {
        if (cancelled) return;
        const fresh = new Map(results.flatMap((r) => (r.status === "fulfilled" ? [[r.value.slug, r.value] as const] : [])));
        setItems((prev) =>
          prev.map((i) => {
            const p = fresh.get(i.product.slug);
            return p ? { ...i, product: { ...i.product, ...p, store: { ...i.product.store, ...p.store } } } : i;
          })
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Latest items, readable synchronously so addItem can tell the caller what happened.
  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; saveCart(items); }, [items]);

  const addItem = useCallback((product: Product, quantity: number, variants: Record<string, string>) => {
    if (!Number.isInteger(quantity) || quantity <= 0) return 0;
    const prev = itemsRef.current;
    const inCart = prev.filter((i) => i.product.id === product.id).reduce((acc, i) => acc + i.quantity, 0);
    const toAdd = Math.min(quantity, Math.max(0, product.stock - inCart));
    if (!toAdd) return 0;
    trackInterest(product.id, "cart");
    const key = cartItemKey(product.id, variants);
    const next = prev.some((i) => cartItemKey(i.product.id, i.selectedVariants) === key)
      ? prev.map((i) => (cartItemKey(i.product.id, i.selectedVariants) === key ? { ...i, quantity: i.quantity + toAdd } : i))
      : [...prev, { product, quantity: toAdd, selectedVariants: variants }];
    itemsRef.current = next; // a second click before re-render must see this one
    setItems(next);
    return toAdd;
  }, []);

  const removeItem = useCallback((productId: string, variants: Record<string, string> = {}) => {
    setItems((prev) => prev.filter((i) => cartItemKey(i.product.id, i.selectedVariants) !== cartItemKey(productId, variants)));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number, variants: Record<string, string> = {}) => {
    if (!Number.isInteger(quantity)) return;
    setItems((prev) => {
      const key = cartItemKey(productId, variants);
      if (quantity <= 0) return prev.filter((i) => cartItemKey(i.product.id, i.selectedVariants) !== key);
      const otherLines = prev
        .filter((i) => i.product.id === productId && cartItemKey(productId, i.selectedVariants) !== key)
        .reduce((acc, i) => acc + i.quantity, 0);
      return prev.map((i) =>
        cartItemKey(i.product.id, i.selectedVariants) === key
          ? { ...i, quantity: Math.max(1, Math.min(quantity, i.product.stock - otherLines)) }
          : i
      );
    });
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((acc, i) => acc + i.quantity, 0);
  const totalPrice = items.reduce((acc, i) => acc + i.product.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice, isOpen, setIsOpen }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
