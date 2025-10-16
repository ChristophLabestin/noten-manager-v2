const CACHE = "app-cache-v2"; // <— Version bump!
const ASSETS = ["/", "/index.html", "/manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;

  // Nicht-GET: nie cachen
  if (req.method !== "GET") {
    e.respondWith(fetch(req));
    return;
  }

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  e.respondWith(
    fetch(req)
      .then(async (res) => {
        // Nur erfolgreiche, gleich-originige Antworten cachen
        if (sameOrigin && res && res.ok) {
          // WICHTIG: explizit GET-Request fürs Cache-Key erzeugen
          const cacheKey = new Request(req.url, { method: "GET" });

          const copy = res.clone();
          try {
            const cache = await caches.open(CACHE);
            await cache.put(cacheKey, copy);
          } catch (err) {
            // Ignorieren, aber nicht crashen
            // console.warn("Cache put failed:", err);
          }
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: false }))
  );
});
