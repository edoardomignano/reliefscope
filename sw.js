/* ReliefScope Service Worker — App-Shell offline + Kacheln/API opportunistisch cachen */
const SHELL_CACHE = 'reliefscope-shell-1783974221';
const RT_CACHE    = 'reliefscope-runtime-v1';
const SHELL = [
  'index.html',
  'manifest.json',
  'icon.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL_CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('SW install', err))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== SHELL_CACHE && k !== RT_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Karten-Kacheln, WMS und Denkmal-API: cache-first (Feld-Offline für besuchte Bereiche).
   Alles andere (App-Shell): network-first mit Cache-Fallback. */
const RUNTIME = /tile\.openstreetmap|geoservices\.bayern|gdiserv\.bayern|geoportal\.bayern|geodaten\.bayern|denkmalservice/;

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  if (RUNTIME.test(req.url)) {
    e.respondWith((async () => {
      const c = await caches.open(RT_CACHE);
      const hit = await c.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        c.put(req, res.clone());          // opaque (Kacheln) darf man cachen, nur nicht lesen
        return res;
      } catch (err) {
        return hit || Response.error();
      }
    })());
    return;
  }

  e.respondWith(
    fetch(req)
      .then(res => { const cc = res.clone(); caches.open(SHELL_CACHE).then(c => c.put(req, cc)); return res; })
      .catch(() => caches.match(req))
  );
});
