const CACHE = "superloja-shell-20261013";
const SHELL = ["/", "/manifest.webmanifest", "/logo-superloja-icon.png", "/superloja-pwa-192-v3.png", "/superloja-pwa-512-v3.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || !event.request.url.startsWith(self.location.origin)) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request, { cache: "no-cache" }).catch(async () => {
      const path = new URL(event.request.url).pathname;
      if (/^\/(checkout|entrar|cadastro-loja|minha-conta|minha-loja|loja\/.*\/painel)(\/|$)/.test(path)) {
        return new Response('<!doctype html><html lang="pt"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ligação indisponível — SuperLoja</title><body style="font-family:system-ui;padding:32px;max-width:540px;margin:auto"><h1>Ligação indisponível</h1><p>Não foi possível contactar a SuperLoja. Verifique a ligação e tente novamente. Se estava a enviar um pedido, consulte o histórico antes de repetir.</p><button onclick="location.reload()" style="padding:12px 20px">Tentar novamente</button></body></html>', {status:503,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}});
      }
      return (await caches.match("/")) || Response.error();
    }));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (response.ok && ["style", "script", "image", "font"].includes(event.request.destination)) {
      const copy = response.clone(); caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    }
    return response;
  })));
});
