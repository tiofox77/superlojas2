import { useQuery } from "@tanstack/react-query";
import fetchApi from "@/services/api";

export interface SiteSettings {
  site_name: string;
  site_description: string;
  site_logo: string;
  site_favicon: string;
  contact_email: string;
  contact_phone: string;
  contact_whatsapp: string;
  contact_address: string;
  contact_city: string;
  contact_hours: { label: string; hours: string }[];
  social_instagram: string;
  social_facebook: string;
  social_tiktok: string;
  social_youtube: string;
  social_twitter: string;
  social_linkedin: string;
  social_website: string;
  category_themes_enabled: boolean;
  marquee_active: boolean;
  marquee_messages: string[];
  marquee_speed: string;
}

const DEFAULTS: SiteSettings = {
  site_name: "SuperLojas",
  site_description: "O maior marketplace de Angola",
  site_logo: "",
  site_favicon: "",
  contact_email: "info@superlojas.ao",
  contact_phone: "+244 923 456 789",
  contact_whatsapp: "+244 923 456 789",
  contact_address: "Talatona, Luanda Sul",
  contact_city: "Luanda, Angola",
  contact_hours: [
    { label: "Segunda - Sexta", hours: "08:00 - 18:00" },
    { label: "Sabado", hours: "09:00 - 13:00" },
    { label: "Domingo", hours: "Encerrado" },
  ],
  social_instagram: "",
  social_facebook: "",
  social_tiktok: "",
  social_youtube: "",
  social_twitter: "",
  social_linkedin: "",
  social_website: "",
  category_themes_enabled: true,
  marquee_active: true,
  marquee_messages: [
    "🎉 Bem-vindo ao SuperLojas — O maior marketplace de Angola!",
    "🔥 Promoções de até 40% OFF em electrónica!",
    "🚚 Frete grátis para Luanda em compras acima de 50.000 Kz",
    "🏪 Quer vender? Abra sua loja gratuitamente!",
  ],
  marquee_speed: "30",
};

export function useSiteSettings() {
  return useQuery<SiteSettings>({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const data = await fetchApi<Partial<SiteSettings>>("/site-settings");
      return { ...DEFAULTS, ...data };
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
    retry: 1,
    placeholderData: DEFAULTS,
  });
}
