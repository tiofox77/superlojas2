import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

interface SiteSettings {
  site_name?: string;
  site_description?: string;
  site_favicon?: string;
  site_logo?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  seo_og_image?: string;
  seo_robots?: string;
  seo_canonical?: string;
  seo_ga_id?: string;
  seo_gtm_id?: string;
  seo_fb_pixel?: string;
  seo_head_scripts?: string;
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

export default function DynamicHead() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;
    fetch(`${API}/site-settings`)
      .then((r) => r.json())
      .then((d: SiteSettings) => {
        // Title
        if (d.seo_title || d.site_name) {
          document.title = d.seo_title || `${d.site_name} — Marketplace de Angola`;
        }

        // Favicon
        if (d.site_favicon) {
          setLink("icon", d.site_favicon, "image/png");
          setLink("apple-touch-icon", d.site_favicon);
        }

        // Meta tags
        setMeta("description", d.seo_description || d.site_description || "");
        setMeta("keywords", d.seo_keywords || "");
        setMeta("robots", d.seo_robots || "index, follow");

        // Canonical
        if (d.seo_canonical) {
          setLink("canonical", d.seo_canonical);
        }

        // Open Graph
        setMeta("og:title", d.seo_title || d.site_name || "", "property");
        setMeta("og:description", d.seo_description || d.site_description || "", "property");
        setMeta("og:type", "website", "property");
        if (d.seo_og_image) setMeta("og:image", d.seo_og_image, "property");
        if (d.seo_canonical) setMeta("og:url", d.seo_canonical, "property");
        if (d.site_name) setMeta("og:site_name", d.site_name, "property");

        // Twitter
        setMeta("twitter:card", "summary_large_image");
        setMeta("twitter:title", d.seo_title || d.site_name || "");
        setMeta("twitter:description", d.seo_description || d.site_description || "");
        if (d.seo_og_image) setMeta("twitter:image", d.seo_og_image);

        // Google Analytics GA4
        if (d.seo_ga_id && !document.querySelector(`script[src*="gtag"]`)) {
          const s1 = document.createElement("script");
          s1.async = true;
          s1.src = `https://www.googletagmanager.com/gtag/js?id=${d.seo_ga_id}`;
          document.head.appendChild(s1);
          const s2 = document.createElement("script");
          s2.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${d.seo_ga_id}');`;
          document.head.appendChild(s2);
        }

        // Google Tag Manager
        if (d.seo_gtm_id && !document.querySelector(`script[src*="googletagmanager.com/gtm"]`)) {
          const s = document.createElement("script");
          s.textContent = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${d.seo_gtm_id}');`;
          document.head.appendChild(s);
        }

        // Facebook Pixel
        if (d.seo_fb_pixel && !document.querySelector(`script[data-fb-pixel]`)) {
          const s = document.createElement("script");
          s.setAttribute("data-fb-pixel", "true");
          s.textContent = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${d.seo_fb_pixel}');fbq('track','PageView');`;
          document.head.appendChild(s);
        }

        // Custom head scripts
        if (d.seo_head_scripts) {
          const container = document.createElement("div");
          container.innerHTML = d.seo_head_scripts;
          Array.from(container.children).forEach((child) => {
            document.head.appendChild(child.cloneNode(true));
          });
        }

        setLoaded(true);
      })
      .catch(() => {});
  }, [loaded]);

  return null;
}
