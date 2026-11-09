// Service worker : l'application fonctionne hors connexion (sauf API et liens externes).
const CACHE = 'lbvma-v12';
const ASSETS = [
  './',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon.svg',
  './css/app.css',
  './index.html',
  './js/app.js',
  './js/data/buying-guide.js',
  './js/data/catalogue.js',
  './js/data/demo-vehicles.js',
  './js/data/dtc-codes.js',
  './js/data/known-defects.js',
  './js/data/tutorials.js',
  './js/lib/defects.js',
  './js/lib/dom.js',
  './js/lib/icons.js',
  './js/lib/maintenance.js',
  './js/lib/obd/elm327.js',
  './js/lib/obd/transports.js',
  './js/lib/plate.js',
  './js/lib/recalls.js',
  './js/lib/router.js',
  './js/lib/scoring.js',
  './js/lib/store.js',
  './js/lib/vin.js',
  './js/views/buying.js',
  './js/views/diagnostic.js',
  './js/views/histovec.js',
  './js/views/home.js',
  './js/views/logbook.js',
  './js/views/settings.js',
  './js/views/vehicle.js',
  './js/views/workshop.js',
  './manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  // Réseau d'abord (contenu à jour), cache en secours hors connexion.
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./'))),
  );
});
