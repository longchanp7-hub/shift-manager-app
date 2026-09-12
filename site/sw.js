const CACHE = "shift-manager-v4-20260912";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./level2.css", "./level2.js"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

function isAppShell(request) {
  if (request.mode === "navigate") return true;
  const dest = request.destination;
  if (dest === "script" || dest === "style" || dest === "document" || dest === "manifest") return true;
  try {
    const path = new URL(request.url).pathname;
    return /(?:\/)?(?:index\.html|level2\.js|level2\.css|sw\.js|manifest\.webmanifest)$/.test(path);
  } catch {
    return false;
  }
}

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  if (isAppShell(event.request)) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => {
              cache.put(event.request, copy);
              if (event.request.mode === "navigate") cache.put("./index.html", response.clone());
            });
          }
          return response;
        })
        .catch(() => caches.match(event.request).then(cached => cached || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
