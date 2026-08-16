// AccraMaps service worker — cache the app shell so the UI opens offline.
// API calls stay network-first; map tiles are left to the browser cache.
const CACHE = 'accramaps-v1';
const SHELL = [
  '/',
  '/css/styles.css',
  '/js/app.js', '/js/api.js', '/js/state.js', '/js/util.js', '/js/map.js',
  '/js/ui.js', '/js/search.js', '/js/directions.js', '/js/gps.js',
  '/js/places.js', '/js/reports.js', '/js/widgets.js', '/js/trotro.js', '/js/auth.js',
  '/manifest.webmanifest',
  '/icons/icon.svg',
  '/vendor/leaflet/leaflet.css',
  '/vendor/leaflet/leaflet.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/')) return; // network only

  e.respondWith(
    caches.match(e.request).then((hit) =>
      hit ||
      fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
    )
  );
});
