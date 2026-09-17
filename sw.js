const CACHE = 'pjok-digital-v3';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

// Install: simpan shell terbaru, lalu langsung aktifkan service worker baru.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate: hapus cache versi lama dan langsung ambil alih halaman.
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
  );
});

// Fetch:
// index.html selalu mencoba jaringan terlebih dahulu agar versi terbaru tampil.
// Jika internet tidak tersedia, gunakan cache lama.
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Jangan mengganggu request ke Google Apps Script atau domain lain.
  if (url.origin !== location.origin) return;

  // Untuk halaman utama/index.html: network first.
  if (
    request.mode === 'navigate' ||
    url.pathname.endsWith('/index.html')
  ) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();

          caches.open(CACHE)
            .then(cache => cache.put(request, copy));

          return response;
        })
        .catch(() =>
          caches.match(request)
            .then(cached =>
              cached || caches.match('./index.html')
            )
        )
    );

    return;
  }

  // File lainnya: cache first, lalu diperbarui dari jaringan.
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
