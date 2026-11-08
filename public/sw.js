// Fatin PWA Service Worker (Hand-written, lightweight)
const CACHE_NAME = "fatin-shell-v1";
const STATIC_SHELL_URLS = [
  "/offline",
  "/logo.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/theme.js",
  "/manifest.webmanifest",
];

// Install: Pre-cache static offline shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate: Clean up old cache versions
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch: Never cache /api; serve /offline for navigation failures
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // STRICT RULE: NEVER cache API routes
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // HTML Page Navigation requests
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedOffline = await cache.match("/offline");
        return cachedOffline || new Response("أنت غير متصل بالإنترنت", {
          status: 503,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      })
    );
    return;
  }

  // Static public assets (images, icons only - NEVER intercept _next/static script chunks)
  if (
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".webmanifest")
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200 && event.request.method === "GET") {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return networkResponse;
        });
      })
    );
  }
});
