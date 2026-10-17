import { useState } from "react";
import { X } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

// Shown only when the admin has no marquee messages configured. Keep these true for every store:
// the old "até 40% OFF" / "frete grátis acima de 50.000 Kz" were not (QA 17-Out — checkout charges 2 500 Kz/loja).
const FALLBACK = [
  "🎉 Bem-vindo ao SuperLoja — compre online em lojas de Angola!",
  "🚚 Entrega a partir de 2 500 Kz por loja — ou levante na loja sem custo, quando disponível",
  "🏪 Quer vender? Abra a sua loja gratuitamente!",
];

export function AnnouncementBar() {
  const [visible, setVisible] = useState(true);
  const { data: settings } = useSiteSettings();

  const active = settings?.marquee_active ?? true;
  const messages = settings?.marquee_messages?.length ? settings.marquee_messages : FALLBACK;
  const speed = settings?.marquee_speed || "30";

  if (!visible || !active || messages.length === 0) return null;

  return (
    <div className="relative bg-foreground text-background overflow-hidden">
      <div className="flex whitespace-nowrap py-2" style={{ animation: `marquee ${speed}s linear infinite` }}>
        {[...messages, ...messages].map((text, i) => (
          <span key={i} className="mx-8 text-xs font-medium">
            {text}
          </span>
        ))}
      </div>
      <button
        onClick={() => setVisible(false)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:opacity-70 transition-opacity"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
