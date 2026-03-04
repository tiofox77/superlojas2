import { useEffect } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const BASE = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api").replace(/\/api\/?$/, "");

interface ProductSeoProps {
  productName: string;
  productSlug: string;
  productDescription?: string;
  productImage?: string;
  productPrice?: number;
  storeName?: string;
  category?: string;
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

function setLink(rel: string, href: string) {
  if (!href) return;
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

export default function ProductSeoHead({
  productName,
  productSlug,
  productDescription,
  productImage,
  productPrice,
  storeName,
  category,
}: ProductSeoProps) {
  const { data: siteSettings } = useSiteSettings();
  const siteName = siteSettings?.site_name || "SuperLojas";

  useEffect(() => {
    const title = storeName
      ? `${productName} — ${storeName} | ${siteName}`
      : `${productName} | ${siteName}`;
    const description = productDescription
      ? productDescription.slice(0, 160)
      : `Compre ${productName}${storeName ? ` na ${storeName}` : ""} no ${siteName}. ${category ? `Categoria: ${category}.` : ""} Entrega em Angola.`;
    const imageUrl = productImage
      ? (productImage.startsWith("http") ? productImage : `${BASE}${productImage}`)
      : "";
    const productUrl = `${window.location.origin}/produto/${productSlug}`;

    document.title = title;

    setMeta("description", description);

    // Open Graph
    setMeta("og:title", title, "property");
    setMeta("og:description", description, "property");
    setMeta("og:type", "product", "property");
    setMeta("og:url", productUrl, "property");
    setMeta("og:site_name", siteName, "property");
    if (imageUrl) setMeta("og:image", imageUrl, "property");

    // Product price
    if (productPrice) {
      setMeta("product:price:amount", String(productPrice), "property");
      setMeta("product:price:currency", "AOA", "property");
    }

    // Twitter
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    if (imageUrl) setMeta("twitter:image", imageUrl);

    // Canonical
    setLink("canonical", productUrl);

    return () => {
      const originalTitle = siteSettings?.site_name
        ? `${siteSettings.site_name} — Marketplace de Angola`
        : "SuperLojas — Marketplace de Angola";
      document.title = originalTitle;
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) canonical.remove();
    };
  }, [productName, productSlug, productDescription, productImage, productPrice, storeName, category, siteName]);

  return null;
}
