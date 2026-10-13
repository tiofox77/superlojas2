import { useEffect, useCallback } from "react";

const SW_CHECK_INTERVAL = 60 * 1000; // Check for updates every 60s

export function usePwaUpdate() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | null = null;

    // Listen for SW_UPDATED message from service worker → auto-reload
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "SW_UPDATED") {
        // New SW activated — reload to load new assets
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);

    // Register SW and set up periodic update checks
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((reg) => {
        registration = reg;

        // When a new SW is found waiting, tell it to activate immediately
        const onStateChange = () => {
          if (reg.waiting) {
            reg.waiting.postMessage({ type: "SKIP_WAITING" });
          }
        };

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", onStateChange);
          }
        });

        // If there's already a waiting worker on load, activate it
        if (reg.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        // Periodic background check for updates
        const interval = setInterval(() => {
          reg.update().catch(() => {});
        }, SW_CHECK_INTERVAL);

        return () => clearInterval(interval);
      })
      .catch(() => {});

    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, []);
}

export function useIsPwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  );
}
