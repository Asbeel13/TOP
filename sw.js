// Service worker pro TOP mobilní přehled — cachuje jen statickou "kostru"
// appky (HTML, JS, ikony), aby se appka po instalaci otevírala okamžitě
// a fungovala aspoň částečně i bez signálu. Samotná data z GitHubu se
// NIKDY necachují — vždy musí být čerstvá.
const CACHE_NAME = "top-mobile-v1";
const APP_SHELL = [
  "tydenni_prehled_mobile.html",
  "ft_loader.js",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Data z GitHub API se NIKDY necachují - musí být vždy aktuální
  if (url.hostname === "api.github.com") return;
  // Cizí originy (CDN apod.) neřešíme
  if (url.origin !== self.location.origin) return;
  // Jen GET požadavky má smysl cachovat
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
