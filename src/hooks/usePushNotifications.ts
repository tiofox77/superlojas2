import { useEffect, useState, useCallback } from "react";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";
const SUBSCRIBED_KEY = "push-subscribed";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check current subscription status on mount
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub);
        if (sub) localStorage.setItem(SUBSCRIBED_KEY, "true");
      });
    });
  }, []);

  const subscribe = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
    setLoading(true);

    try {
      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setLoading(false);
        return false;
      }

      // Get VAPID public key from server
      const keyRes = await fetch(`${API}/push/vapid-key`);
      if (!keyRes.ok) { setLoading(false); return false; }
      const { publicKey } = await keyRes.json();

      // Subscribe via PushManager
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      // Send subscription to backend
      const subJson = subscription.toJSON();
      await fetch(`${API}/push/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: {
            p256dh: subJson.keys?.p256dh || "",
            auth: subJson.keys?.auth || "",
          },
        }),
      });

      setIsSubscribed(true);
      localStorage.setItem(SUBSCRIBED_KEY, "true");
      setLoading(false);
      return true;
    } catch (err) {
      console.error("Push subscribe error:", err);
      setLoading(false);
      return false;
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;
    setLoading(true);

    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();

        await fetch(`${API}/push/unsubscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }

      setIsSubscribed(false);
      localStorage.removeItem(SUBSCRIBED_KEY);
    } catch (err) {
      console.error("Push unsubscribe error:", err);
    }
    setLoading(false);
  }, []);

  return { permission, isSubscribed, loading, subscribe, unsubscribe };
}

/**
 * Auto-subscribe component — silently subscribes after a delay if user hasn't been asked yet.
 * Only triggers on PWA standalone mode.
 */
export function useAutoSubscribe(delayMs = 10000) {
  const { permission, isSubscribed, subscribe } = usePushNotifications();

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (!("PushManager" in window)) return;

    // Only auto-ask if permission is default (never asked)
    if (permission !== "default") return;
    if (isSubscribed) return;

    // Check if running as installed PWA
    const isPwa =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;

    if (!isPwa) return;

    const timer = setTimeout(() => {
      subscribe();
    }, delayMs);

    return () => clearTimeout(timer);
  }, [permission, isSubscribed, subscribe, delayMs]);
}
