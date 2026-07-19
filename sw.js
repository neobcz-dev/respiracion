const CACHE = "respiracion-v3";
const CORE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => (k !== CACHE ? caches.delete(k) : null))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "skipWaiting") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // El HTML de la app: RED PRIMERO (siempre la versión más nueva; offline como respaldo).
  const isDocument =
    req.mode === "navigate" ||
    (sameOrigin && (url.pathname.endsWith("/") || url.pathname.endsWith("index.html")));

  if (isDocument) {
    e.respondWith(
      fetch(req)
        .then((resp) => {
          if (resp && resp.status === 200) {
            const copy = resp.clone();
            caches.open(CACHE).then((c) => c.put("./index.html", copy));
          }
          return resp;
        })
        .catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  // Recursos estáticos del mismo origen: caché primero con respaldo de red.
  if (sameOrigin) {
    e.respondWith(
      caches.match(req).then((cached) =>
        cached ||
        fetch(req).then((resp) => {
          if (resp && resp.status === 200) {
            const copy = resp.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return resp;
        }).catch(() => cached)
      )
    );
    return;
  }
  // Otros orígenes (YouTube, etc.): red normal.
});
