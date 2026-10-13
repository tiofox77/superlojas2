import { useEffect } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const BASE = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api").replace(/\/api\/?$/, "");

interface StoreSeoProps {
  storeName: string;
  storeSlug: string;
  storeDescription?: string;
  storeLogo?: string;
  storeBanner?: string;
  province?: string;
  city?: string;
  phone?: string;
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
  storeBanner,
  province,
  city,
  phone,
  metaTitle,
  metaDescription,
  metaKeywords,
  isSubdomain = false,
}: StoreSeoProps) {
  const { data: siteSettings } = useSiteSettings();
  const siteName = siteSettings?.site_name || "SuperLoja";

  useEffect(() => {
    const title = metaTitle
      ? `${metaTitle} — ${siteName}`
      : `${storeName} — ${siteName}`;
    const clean = (value = "") => value.replace(/\s+/g, " ").trim();
    const description = clean(metaDescription || storeDescription || `${storeName} no ${siteName}. Compre online com entrega em Angola.`).slice(0, 160);
    const absolute = (value?: string) => value ? (value.startsWith("http") ? value : `${BASE}${value}`) : "";
    const logoUrl = absolute(storeLogo);
    const shareImage = absolute(storeBanner) || logoUrl || `${window.location.origin}/og-superloja.jpg`;
    const storeUrl = isSubdomain
      ? window.location.origin
      : `${window.location.origin}/lojas/${storeSlug}`;

    // Title
    document.title = title;

    // Meta
    setMeta("description", description);
    setMeta("robots", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
    if (metaKeywords) setMeta("keywords", metaKeywords);

    // Open Graph
    setMeta("og:title", title, "property");
    setMeta("og:description", description, "property");
    setMeta("og:type", "website", "property");
    setMeta("og:url", storeUrl, "property");
    setMeta("og:site_name", siteName, "property");
    setMeta("og:locale", "pt_AO", "property");
    setMeta("og:image", shareImage, "property");
    setMeta("og:image:alt", `${storeName} — loja online`, "property");

    // Twitter
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    setMeta("twitter:image", shareImage);

    // Always the SuperLoja favicon (store logos made poor favicons)
    setLink("icon", "/superloja-favicon-v3.ico", "image/x-icon");
    setLink("apple-touch-icon", "/superloja-apple-v3.png", "image/png");

    // Canonical — always the main-domain store page (subdomains have no TLS)
    setLink("canonical", `https://superloja.vip/lojas/${storeSlug}`);

    // Structured data for Google and other search engines.
    const ldId = "store-structured-data";
    document.getElementById(ldId)?.remove();
    const ld = document.createElement("script");
    ld.id = ldId;
    ld.type = "application/ld+json";
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "OnlineStore",
      "@id": `${storeUrl}#store`,
      name: storeName,
      url: storeUrl,
      description,
      ...(logoUrl ? { logo: logoUrl, image: shareImage } : {}),
      ...(phone ? { telephone: phone } : {}),
      address: (province || city) ? {
        "@type": "PostalAddress",
        addressLocality: city,
        addressRegion: province,
        addressCountry: "AO",
      } : undefined,
      parentOrganization: { "@type": "Organization", name: siteName, url: "https://superloja.vip" },
    });
    document.head.appendChild(ld);

    // Cleanup: restore original title when unmounting
    return () => {
      const originalTitle = siteSettings?.site_name
        ? `${siteSettings.site_name} — Marketplace de Angola`
        : "SuperLoja — Marketplace de Angola";
      document.title = originalTitle;

      // Remove store-specific canonical
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) canonical.remove();
      document.getElementById(ldId)?.remove();
    };
  }, [storeName, storeSlug, storeDescription, storeLogo, storeBanner, province, city, phone, metaTitle, metaDescription, metaKeywords, isSubdomain, siteName]);

  return null;
}
