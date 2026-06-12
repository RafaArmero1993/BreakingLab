/* ════════════════════════════════════════════════════════════════
   SERVICE WORKER — BreakingLab PWA
   Estrategias:
   - Navegaciones (HTML): red primero, caché de respaldo → las
     versiones nuevas se ven en cuanto hay conexión.
   - Assets propios: stale-while-revalidate → respuesta instantánea
     desde caché y actualización en segundo plano.
   - Fuentes de Google: stale-while-revalidate en caché aparte.
   Sube CACHE_VERSION al publicar cambios.
════════════════════════════════════════════════════════════════ */
const CACHE_VERSION = 'breakinglab-v2.0.0';

const PRECACHE = [
  './',
  './index.html',
  './style.css',
  './game.js',
  './ai-player.js',
  './adventure.js',
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

  const url = new URL(req.url);

  /* Fuentes de Google: stale-while-revalidate en caché aparte */
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

  /* Navegaciones (HTML): red primero para ver versiones nuevas al instante */
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(
      fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() =>
        caches.match(req).then((cached) => cached || caches.match('./index.html'))
      )
    );
    return;
  }

  /* Assets propios: stale-while-revalidate */
  e.respondWith(
    caches.open(CACHE_VERSION).then(async (c) => {
      const cached = await c.match(req);
      const fresh = fetch(req).then((res) => {
        if (res.ok && url.origin === location.origin) c.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || fresh;
    })
  );
});
