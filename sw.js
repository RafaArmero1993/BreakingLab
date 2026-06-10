/* ════════════════════════════════════════════════════════════════
   SERVICE WORKER — BreakingLab PWA
   Precachea la app completa para que funcione 100% offline una
   vez instalada. Sube CACHE_VERSION al publicar cambios.
════════════════════════════════════════════════════════════════ */
const CACHE_VERSION = 'breakinglab-v1.0.1';

const PRECACHE = [
  './',
  './index.html',
  './style.css',
  './game.js',
  './ai-player.js',
  './game-data.js',
  './card-config.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-192.png',
  './icons/maskable-512.png',
  './img/H.png',
  './img/O.png',
  './img/N.png',
  './img/C.png',
  './img/S.png',
  './img/P.png',
  './img/U.png',
  './img/Pb.png',
  './img/He.png',
  './img/analista.png',
  './img/mazo.png',
  './img/marco.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  /* Fuentes de Google: stale-while-revalidate en caché aparte */
  const url = new URL(req.url);
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(CACHE_VERSION + '-fonts').then(async (c) => {
        const cached = await c.match(req);
        const fresh = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => cached);
        return cached || fresh;
      })
    );
    return;
  }

  /* App shell: cache-first con fallback a red */
  e.respondWith(
    caches.match(req).then((cached) =>
      cached ||
      fetch(req).then((res) => {
        if (res.ok && url.origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match('./index.html'))
    )
  );
});
