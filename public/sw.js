/* Life Hub service worker: lets the offline video library open without internet.
   - Hashed build files (/assets/*) and icons: cache-first.
   - Pages: network-first; when offline, the cached page or a redirect to /offline.
   - Never caches backend/API calls. */
const CACHE = "lifehub-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_serverFn") || url.pathname.startsWith("/~")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(url.pathname, copy));
          }
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE);
          if (url.pathname === "/offline") {
            const hit = await cache.match("/offline");
            if (hit) return hit;
          }
          return new Response(
            '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><script>location.replace("/offline")</script>Sem internet. Abrindo vídeos offline…',
            { headers: { "content-type": "text/html; charset=utf-8" } },
          );
        }),
    );
    return;
  }

  const isStatic = url.pathname.startsWith("/assets/") || /\.(png|ico|webmanifest|css|js|woff2?)$/.test(url.pathname);
  if (!isStatic) return;
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
