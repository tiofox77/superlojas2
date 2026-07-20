// ─── SuperLojas PWA Service Worker ───
// Bump VERSION to trigger auto-update on all clients
const VERSION = '20';
const CACHE_NAME = 'superlojas-v' + VERSION;

// Install — immediately activate (skipWaiting)
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate — purge ALL old caches, claim all clients instantly
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
     .then(() => {
       // Notify all open tabs that a new version is active
       self.clients.matchAll({ type: 'window' }).then((clients) => {
         clients.forEach((client) => client.postMessage({ type: 'SW_UPDATED', version: VERSION }));
       });
     })
  );
});

// Fetch strategy:
//   Navigation (HTML pages) → Network-first (always get latest, fallback to cache)
//   Hashed assets (/assets/) → Cache-first (immutable filenames)
//   Everything else → Network-first with cache fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  // API / auth — never cache
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/sanctum/')) return;

  // Chrome extensions, etc.
  if (!url.protocol.startsWith('http')) return;

  // Navigation requests (HTML) — ALWAYS network-first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => caches.match('/index.html').then((r) => r || caches.match('/')))
    );
    return;
  }

  // Hashed static assets (JS/CSS with hash in filename) — cache-first
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // Other resources (images, fonts, etc.) — network-first, cache fallback
  event.respondWith(
    fetch(request).then((response) => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
      }
      return response;
    }).catch(() => caches.open(CACHE_NAME).then((cache) => cache.match(request)))
  );
});

// ─── Push Notifications ───
self.addEventListener('push', (event) => {
  let data = { title: 'SuperLojas', body: 'Novidade disponivel!', icon: '/pwa-192.png', badge: '/pwa-192.png', url: '/' };
  try {
    if (event.data) {
      const json = event.data.json();
      data = { ...data, ...json };
    }
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }

  const options = {
    body: data.body,
    icon: data.icon || '/pwa-192.png',
    badge: data.badge || '/pwa-192.png',
    image: data.image || undefined,
    tag: data.tag || 'superlojas-notification',
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'close', title: 'Fechar' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click — open the target URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if possible
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Otherwise open new window
      return self.clients.openWindow(url);
    })
  );
});
