/**
 * Image helpers — fallback placeholders for missing/broken images
 */

const PLACEHOLDER_LOGO = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "L")}&background=F97316&color=fff&size=128&bold=true`;

const PLACEHOLDER_BANNER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='400'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23f97316'/%3E%3Cstop offset='100%25' stop-color='%23ea580c'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='1200' height='400' fill='url(%23g)'/%3E%3C/svg%3E";

const PLACEHOLDER_PRODUCT =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='400' height='400' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='48' fill='%239ca3af'%3E%F0%9F%93%B7%3C/text%3E%3C/svg%3E";

/** Get a safe logo URL with fallback */
export function logoSrc(url: string | undefined | null, name = ""): string {
  if (url && url.trim()) return resolveStorageUrl(url);
  return PLACEHOLDER_LOGO(name);
}

/** Get a safe banner URL with fallback */
export function bannerSrc(url: string | undefined | null): string {
  if (url && url.trim()) return resolveStorageUrl(url);
  return PLACEHOLDER_BANNER;
}

const API_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api").replace(/\/api\/?$/, "");

/** Resolve /storage/ paths to absolute URLs (storage lives under /api/storage/) */
export function resolveStorageUrl(url: string): string {
  if (!url || !url.startsWith("/storage")) return url;
  return `${API_URL}/api${url}`;
}

/** Get a safe product image URL with fallback */
export function productImgSrc(url: string | undefined | null): string {
  if (url && url.trim()) return resolveStorageUrl(url);
  return PLACEHOLDER_PRODUCT;
}

/** onError handler for <img> — swaps src to a fallback */
export function onImgError(type: "logo" | "banner" | "product", name = "") {
  return (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    if (target.dataset.fallback === "1") return; // prevent infinite loop
    target.dataset.fallback = "1";
    if (type === "logo") target.src = PLACEHOLDER_LOGO(name);
    else if (type === "banner") target.src = PLACEHOLDER_BANNER;
    else target.src = PLACEHOLDER_PRODUCT;
  };
}
