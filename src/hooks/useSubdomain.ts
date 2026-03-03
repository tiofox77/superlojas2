/**
 * Subdomain detection utility.
 *
 * Reads VITE_BASE_DOMAIN (e.g. "superlojas.ao" or "lojas.test")
 * and checks if the current hostname has a subdomain prefix.
 *
 * Examples:
 *   techzone.superlojas.ao  →  storeSlug = "techzone"
 *   superlojas.ao           →  storeSlug = null  (main site)
 *   localhost                →  storeSlug = null  (dev without subdomain)
 */

const BASE_DOMAIN = import.meta.env.VITE_BASE_DOMAIN || "";

export function getStoreSlugFromSubdomain(): string | null {
  if (!BASE_DOMAIN) return null;

  const host = window.location.hostname; // e.g. "techzone.lojas.test"

  // Must end with the base domain
  if (!host.endsWith(BASE_DOMAIN)) return null;

  // Extract prefix: "techzone.lojas.test" → "techzone"
  const prefix = host.slice(0, host.length - BASE_DOMAIN.length);

  // No prefix or just the base domain
  if (!prefix || prefix === ".") return null;

  // Remove trailing dot: "techzone." → "techzone"
  const slug = prefix.endsWith(".") ? prefix.slice(0, -1) : prefix;

  // Ignore common non-store subdomains
  const reserved = ["www", "api", "admin", "mail", "ftp", "cpanel", "webmail", "cpcalendars", "cpcontacts"];
  if (reserved.includes(slug.toLowerCase())) return null;

  // No nested subdomains (e.g. "a.b" is invalid)
  if (slug.includes(".")) return null;

  return slug.toLowerCase();
}

export function isSubdomainMode(): boolean {
  return getStoreSlugFromSubdomain() !== null;
}

export function getMainSiteUrl(): string {
  const protocol = window.location.protocol;
  return `${protocol}//${BASE_DOMAIN}`;
}
