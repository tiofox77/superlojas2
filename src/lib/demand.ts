const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

/**
 * Demand signal for the home "Produtos em Destaque" ranking (see api/app/Services/ProductDemand.php).
 * Fire-and-forget: `keepalive` lets the request finish while the browser opens WhatsApp.
 */
export function trackInterest(productId: string | number, type: "whatsapp" | "cart") {
  try {
    fetch(`${API}/products/${productId}/interest`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ type }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* tracking must never break the page */
  }
}
