// Facebook Pixel helper — per-store, loaded on demand.
// Injects the standard pixel snippet once, inits the given pixel id, and
// exposes event tracking (PageView, ViewContent, Purchase, etc.).

const inited = new Set<string>();

function ensureBootstrap(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { fbq?: (...args: unknown[]) => void; _fbq?: unknown };
  if (w.fbq) return true;
  /* eslint-disable */
  (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!f._fbq) f._fbq = n;
    n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
    t = b.createElement(e); t.async = !0; t.src = v;
    s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable */
  return true;
}

/** Initialise a store pixel (idempotent) and fire a PageView. */
export function initPixel(pixelId?: string | null): void {
  if (!pixelId || !ensureBootstrap()) return;
  const fbq = (window as unknown as { fbq: (...a: unknown[]) => void }).fbq;
  if (!inited.has(pixelId)) {
    fbq("init", pixelId);
    inited.add(pixelId);
  }
  fbq("trackSingle", pixelId, "PageView");
}

/** Fire a standard event scoped to a specific pixel. */
export function pixelTrack(pixelId: string | null | undefined, event: string, data?: Record<string, unknown>): void {
  if (!pixelId || typeof window === "undefined") return;
  const w = window as unknown as { fbq?: (...a: unknown[]) => void };
  if (!w.fbq || !inited.has(pixelId)) return;
  w.fbq("trackSingle", pixelId, event, data || {});
}
