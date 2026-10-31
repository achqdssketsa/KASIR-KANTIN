/* Kantin Insya — service worker agar aplikasi bisa dipakai tanpa internet.
 * BUILD diisi otomatis saat deploy (scripts/stamp-version.js). Setiap BUILD baru
 * membuat browser mengunduh ulang seluruh file aplikasi secara utuh. */
var BUILD = 'dev';
var CACHE = 'kantin-insya-' + BUILD;
var FONT_CACHE = 'kantin-insya-fonts';
var CORE = [
  './', './index.html', './css/style.css', './js/store.js', './js/app.js', './manifest.webmanifest',
  './assets/icon.svg', './assets/icon-192.png', './assets/icon-512.png', './assets/icon-maskable-512.png',
  './assets/apple-touch-icon.png', './assets/favicon-48.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE && k !== FONT_CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  /* Font Google: disimpan saat pertama kali online, dipakai terus saat offline. */
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONT_CACHE).then(function (cache) {
      return cache.match(req).then(function (hit) {
        if (hit) return hit;
        return fetch(req).then(function (res) { if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; })
          .catch(function () {
            return url.hostname === 'fonts.googleapis.com' ? new Response('', { status: 200, headers: { 'Content-Type': 'text/css' } }) : Response.error();
          });
      });
    }));
    return;
  }

  if (url.origin !== location.origin) return;

  /* File aplikasi: utamakan cache (cepat & tahan sinyal jelek); buka halaman utama bila alamat tidak dikenal. */
  e.respondWith(caches.open(CACHE).then(function (cache) {
    return cache.match(req, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(function () {
        return req.mode === 'navigate' ? cache.match('./index.html') : Response.error();
      });
    });
  }));
});
