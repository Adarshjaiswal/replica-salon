const CACHE_VERSION = "replica-public-v3";
const OFFLINE_URL = "/offline";
const PUBLIC_SHELL = [
  "/",
  "/services",
  "/blog",
  "/contact",
  OFFLINE_URL,
  "/icons/replica-salon-icon-192.png",
  "/icons/replica-salon-icon-512.png",
  "/icons/replica-salon-icon-maskable-512.png",
  "/icons/replica-salon-apple-touch-icon.png",
];

const PRIVATE_PATH_PREFIXES = [
  "/admin",
  "/account",
  "/addresses",
  "/cart",
  "/checkout",
  "/login",
  "/orders",
  "/payments",
  "/register",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PUBLIC_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isPrivatePath(pathname) {
  return PRIVATE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return;
  }

  if (request.mode === "navigate") {
    if (isPrivatePath(url.pathname)) {
      event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
      return;
    }

    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches
              .open(CACHE_VERSION)
              .then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(
          async () =>
            (await caches.match(request)) ?? caches.match(OFFLINE_URL),
        ),
    );
    return;
  }

  if (["image", "font", "style", "script"].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches
              .open(CACHE_VERSION)
              .then((cache) => cache.put(request, copy));
          }
          return response;
        });
        return cached ?? network;
      }),
    );
  }
});
