const CACHE = 'pjok-digital-v4';
const APP_VERSION = '2026-09-17-v4';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

// ===============================
// INSTALL
// ===============================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ===============================
// ACTIVATE
// ===============================
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
      .then(() =>
        self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true
        })
      )
      .then(clients => {
        // Setelah SW baru aktif,
        // reload halaman yang sedang terbuka
        clients.forEach(client => {
          if (client.url) {
            client.navigate(client.url);
          }
        });
      })
  );
});

// ===============================
// FETCH
// ===============================
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Jangan ganggu request ke domain lain,
  // termasuk Google Apps Script.
  if (url.origin !== location.origin) return;

  // ==========================================
  // INDEX / NAVIGASI
  // Selalu ambil versi terbaru dari jaringan
  // ==========================================
  if (
    request.mode === 'navigate' ||
    url.pathname.endsWith('/index.html')
  ) {

    event.respondWith(
      fetch(request, {
        cache: 'no-store'
      })
      .then(response => {

        const copy = response.clone();

        caches.open(CACHE)
          .then(cache => cache.put('./index.html', copy));

        return response;
      })
      .catch(() =>
        caches.match('./index.html')
      )
    );

    return;
  }

  // ==========================================
  // FILE LAIN
  // Cache first → update dari jaringan
  // ==========================================
  event.respondWith(
    caches.match(request)
      .then(cached => {

        const network = fetch(request)
          .then(response => {

            if (response && response.ok) {

              const copy = response.clone();

              caches.open(CACHE)
                .then(cache => cache.put(request, copy));
            }

            return response;
          })
          .catch(() => cached);

        return cached || network;
      })
  );
});
