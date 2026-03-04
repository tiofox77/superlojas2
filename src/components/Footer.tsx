import { Link } from "react-router-dom";
import { Store, Mail, Phone, MapPin, Instagram, Facebook, Globe } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export function Footer() {
  const { data: settings } = useSiteSettings();

  const socials = [
    { url: settings?.social_instagram, icon: Instagram, label: "Instagram" },
    { url: settings?.social_facebook, icon: Facebook, label: "Facebook" },
    { url: settings?.social_tiktok, icon: Globe, label: "TikTok" },
    { url: settings?.social_youtube, icon: Globe, label: "YouTube" },
    { url: settings?.social_twitter, icon: Globe, label: "X" },
  ].filter((s) => s.url);

  return (
    <footer className="border-t border-border bg-card mt-16">
      <div className="container py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <Link to="/" className="flex items-center gap-2 font-extrabold text-lg mb-4">
              {settings?.site_logo ? (
                <img src={settings.site_logo} alt={settings.site_name || "SuperLojas"} style={{ height: `${settings.logo_footer_height || 32}px` }} className="max-w-[180px] object-contain" />
              ) : (
                <>
                  <div className="h-7 w-7 rounded-lg bg-hero-gradient flex items-center justify-center">
                    <Store className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                  Super<span className="text-gradient">Lojas</span>
                </>
              )}
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {settings?.site_description || "O maior marketplace de Angola. Conectando lojas e clientes em todo o país."}
            </p>
            {socials.length > 0 && (
              <div className="flex gap-2 mt-4">
                {socials.map((s) => (
                  <a key={s.label} href={s.url!} target="_blank" rel="noopener noreferrer"
                    className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors">
                    <s.icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>
          <div>
            <h4 className="font-semibold mb-3">Marketplace</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/lojas" className="hover:text-foreground transition-colors">Todas as Lojas</Link></li>
              <li><Link to="/categorias" className="hover:text-foreground transition-colors">Categorias</Link></li>
              <li><Link to="/ofertas" className="hover:text-foreground transition-colors">Ofertas</Link></li>
              <li><Link to="/cadastro-loja" className="hover:text-foreground transition-colors">Quero Vender</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Ajuda</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/como-comprar" className="hover:text-foreground transition-colors">Como Comprar</Link></li>
              <li><Link to="/termos" className="hover:text-foreground transition-colors">Termos de Uso</Link></li>
              <li><Link to="/privacidade" className="hover:text-foreground transition-colors">Politica de Privacidade</Link></li>
              <li><Link to="/faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Contacto</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> {settings?.contact_email || "info@superlojas.ao"}</li>
              <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> {settings?.contact_phone || "+244 923 456 789"}</li>
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {settings?.contact_city || "Luanda, Angola"}</li>
              <li><Link to="/contacto" className="hover:text-foreground transition-colors">Enviar Mensagem</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-border text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} {settings?.site_name || "SuperLojas"}. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
