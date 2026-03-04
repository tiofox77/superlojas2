import { useEffect } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const BASE = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api").replace(/\/api\/?$/, "");

interface StoreSeoProps {
  storeName: string;
  storeSlug: string;
  storeDescription?: string;
  storeLogo?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  isSubdomain?: boolean;
}

function setMeta(name: string, content: string, attr = "name") {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setLink(rel: string, href: string, type?: string) {
  if (!href) return;
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
  if (type) el.type = type;
}

export default function StoreSeoHead({
  storeName,
  storeSlug,
  storeDescription,
  storeLogo,
  metaTitle,
  metaDescription,
  metaKeywords,
  isSubdomain = false,
}: StoreSeoProps) {
  const { data: siteSettings } = useSiteSettings();
  const siteName = siteSettings?.site_name || "SuperLojas";

  useEffect(() => {
    const title = metaTitle
      ? `${metaTitle} — ${siteName}`
      : `${storeName} — ${siteName}`;
    const description = metaDescription || storeDescription || `${storeName} no ${siteName}. Veja os melhores produtos e ofertas.`;
    const logoUrl = storeLogo
      ? (storeLogo.startsWith("http") ? storeLogo : `${BASE}${storeLogo}`)
      : "";
    const storeUrl = isSubdomain
      ? window.location.origin
      : `${window.location.origin}/lojas/${storeSlug}`;

    // Title
    document.title = title;

    // Meta
    setMeta("description", description);
    if (metaKeywords) setMeta("keywords", metaKeywords);

    // Open Graph
    setMeta("og:title", title, "property");
    setMeta("og:description", description, "property");
    setMeta("og:type", "website", "property");
    setMeta("og:url", storeUrl, "property");
    setMeta("og:site_name", siteName, "property");
    if (logoUrl) setMeta("og:image", logoUrl, "property");

    // Twitter
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    if (logoUrl) setMeta("twitter:image", logoUrl);

    // Favicon override for subdomain (use store logo as favicon)
    if (isSubdomain && logoUrl) {
      setLink("icon", logoUrl);
      setLink("apple-touch-icon", logoUrl);
    }

    // Canonical
    setLink("canonical", storeUrl);

    // Cleanup: restore original title when unmounting
    return () => {
      const originalTitle = siteSettings?.site_name
        ? `${siteSettings.site_name} — Marketplace de Angola`
        : "SuperLojas — Marketplace de Angola";
      document.title = originalTitle;

      // Remove store-specific canonical
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) canonical.remove();
    };
  }, [storeName, storeSlug, storeDescription, storeLogo, metaTitle, metaDescription, metaKeywords, isSubdomain, siteName]);

  return null;
}
