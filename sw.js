// Service Worker: sorgt für Offline-Fähigkeit und schnelles Laden auf dem iPhone.
const CACHE_VERSION = 'omnia-v2';

const PRECACHE_URLS = [
  './',
  './index.html',
  './header.html',
  './style.css',
  './manifest.json',
  './utils.js',
  './db.js',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './favicon-32.png',
  './js/header.js',
  './js/index.js',
  './js/sw-register.js',
  './anwesenheitsliste.html',
  './anwesenheitsliste.js',
  './busfahrer.html',
  './js/busfahrer.js',
  './css/busfahrer.css',
  './mitspieler.html',
  './js/mitspieler.js',
  './css/mitspieler.css',
  './einstellungen.html',
  './js/einstellungen.js',
  './neuer-termin.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch((err) => console.error('Precache-Fehler:', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Seitenaufrufe (Navigation): Netzwerk zuerst, damit Aenderungen sofort ankommen,
  // mit Cache-Fallback fuer den Offline-Fall.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  // Statische Assets: Cache zuerst fuer maximale Geschwindigkeit,
  // im Hintergrund aktualisieren.
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
