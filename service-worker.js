const CACHE_NAME = 'deepsweep-cache-v1.0';  // ← promijeni verziju kad mijenjaš fajlove!

const urlsToCache = [
  '/', 
  '/index.html',
  '/manifest.json',
  '/data.json',
  '/version.json',
  '/logo.png',
  '/icon-192.png',
  '/icon-512.png'
  '/workshop_bcg.png'
  '/toxic_bcg.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching files...');
        return cache.addAll(urlsToCache)
          .then(() => console.log('[SW] All files cached successfully'))
          .catch(err => console.error('[SW] Cache addAll failed:', err));
      })
      .catch(err => console.error('[SW] Cache open failed:', err))
  );

  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );

  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);


  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          console.log('[SW] Serving from cache:', event.request.url);
          return cachedResponse;
        }

        return fetch(event.request)
          .then(networkResponse => {
            
            if (!networkResponse || networkResponse.status !== 200 || event.request.method !== 'GET') {
              return networkResponse;
            }

            
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
                console.log('[SW] Cached on fetch:', event.request.url);
              });

            return networkResponse;
          })
          .catch(() => {
            
            console.log('[SW] Fetch failed, no cache:', event.request.url);
            
          });
      })
  );
});