import { useState, useEffect, useCallback } from "react";
import { X, Download, Smartphone, Share } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-dismissed";
const DISMISS_DAYS = 7;

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
}

function isInStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const { data: settings } = useSiteSettings();

  useEffect(() => {
    // Already installed
    if (isInStandaloneMode()) return;

    // Dismissed recently
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissedAt = Number(dismissed);
      if (Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000) return;
    }

    // iOS — show custom guide after delay
    if (isIos()) {
      const timer = setTimeout(() => setShowIosGuide(true), 3000);
      return () => clearTimeout(timer);
    }

    // Android/Desktop — listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show after a short delay so user sees the page first
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    setShowIosGuide(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  }, []);

  const siteName = settings?.site_name || "SuperLojas";
  const siteLogo = settings?.site_logo || "";

  // Android/Desktop prompt
  if (showPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-[360px] z-[9999] animate-in slide-in-from-bottom-5 duration-500">
        <div className="rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
          {/* Header gradient */}
          <div className="bg-gradient-to-r from-orange-500 to-pink-500 px-5 py-4 text-white">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {siteLogo ? (
                  <img src={siteLogo} alt={siteName} className="h-12 w-12 rounded-xl bg-white/20 p-1 object-contain" />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <Smartphone className="h-6 w-6" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-sm">Instalar {siteName}</h3>
                  <p className="text-white/80 text-[11px] mt-0.5">Tenha acesso rapido no seu telemovel</p>
                </div>
              </div>
              <button onClick={handleDismiss} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center text-[10px] font-bold">1</span>
                  Acesso rapido a partir do ecra inicial
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center text-[10px] font-bold">2</span>
                  Funciona mesmo offline
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center text-[10px] font-bold">3</span>
                  Experiencia de app nativa
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={handleInstall}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs font-bold hover:opacity-90 transition-opacity shadow-sm">
                <Download className="h-4 w-4" /> Instalar Agora
              </button>
              <button onClick={handleDismiss}
                className="px-4 py-2.5 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors">
                Agora nao
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // iOS guide
  if (showIosGuide) {
    return (
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-[360px] z-[9999] animate-in slide-in-from-bottom-5 duration-500">
        <div className="rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-5 py-4 text-white">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {siteLogo ? (
                  <img src={siteLogo} alt={siteName} className="h-12 w-12 rounded-xl bg-white/20 p-1 object-contain" />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <Smartphone className="h-6 w-6" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-sm">Adicionar {siteName}</h3>
                  <p className="text-white/80 text-[11px] mt-0.5">Instale no seu iPhone/iPad</p>
                </div>
              </div>
              <button onClick={handleDismiss} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <div className="space-y-2.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-[10px] font-bold">1</span>
                Toque no botao <Share className="inline h-3.5 w-3.5 mx-0.5 text-blue-500" /> Partilhar
              </div>
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-[10px] font-bold">2</span>
                Selecione "Adicionar ao Ecra Inicial"
              </div>
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-[10px] font-bold">3</span>
                Toque em "Adicionar" para confirmar
              </div>
            </div>

            <button onClick={handleDismiss}
              className="w-full px-4 py-2.5 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors">
              Entendi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
