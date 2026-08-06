/* IoTMart service worker — v1
 *
 * Strategy:
 *  - Static assets (_next/static, /uploads, fonts): cache-first.
 *  - Same-origin GET page navigations: network-first with cache fallback.
 *  - Everything else same-origin: network-first, cache fallback.
 *  - Cross-origin requests are skipped entirely.
 */
const CACHE_VERSION = "iotmart-v1";
const STATIC_CACHE = CACHE_VERSION;
const NAV_CACHE = `${CACHE_VERSION}-pages`;

const STATIC_PREFIXES = ["/_next/static/", "/uploads/"];
const FONT_RE = /\.(woff2?|ttf|otf|eot)(\?|#|$)/i;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("iotmart-") && k !== STATIC_CACHE && k !== NAV_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  return STATIC_PREFIXES.some((p) => url.pathname.startsWith(p)) || FONT_RE.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for page navigations (always serve fresh, fall back to cache).
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches
            .open(NAV_CACHE)
            .then((cache) => cache.put(req, copy))
            .catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match("/"))
        )
    );
    return;
  }

  // Cache-first for static assets.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches
                .open(STATIC_CACHE)
                .then((cache) => cache.put(req, copy))
                .catch(() => {});
            }
            return res;
          })
      )
    );
    return;
  }

  // Network-first for everything else, fall back to cache when offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches
            .open(STATIC_CACHE)
            .then((cache) => cache.put(req, copy))
            .catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
