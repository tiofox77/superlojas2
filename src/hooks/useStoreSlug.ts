import { useParams } from "react-router-dom";
import { getStoreSlugFromSubdomain } from "@/hooks/useSubdomain";

/**
 * Returns the store slug — from URL params (/lojas/:slug) or from subdomain.
 * Subdomain takes priority when present.
 */
export function useStoreSlug(): string | undefined {
  const { slug } = useParams<{ slug: string }>();
  const subdomainSlug = getStoreSlugFromSubdomain();
  return subdomainSlug || slug;
}
