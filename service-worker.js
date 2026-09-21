const CACHE_NAME = 'deepsweep-cache-v1.3a';  // ← promijeni verziju kad mijenjaš fajlove (nije više nužno, vidi network-first ispod)

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/data.json',
  '/version.json',
  '/logo.png',
  '/icon-192.png',
  '/icon-512.png',
  '/workshop_bcg.png',
  '/toxic_bcg.png',
  '/museum_map.png'
];

// Datoteke koje se MORAJU uvijek dohvatiti svježe s mreže (cache je samo za offline)
const NETWORK_FIRST = ['/', '/index.html', '/version.json', '/data.json', '/manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(
        urlsToCache.map(url =>
          // cache: 'reload' zaobilazi HTTP cache preglednika, inače se u novi cache
          // može spremiti STARA verzija datoteke (uzrok povratka na v1.2)
          fetch(new Request(url, { cache: 'reload' }))
            .then(res => (res && res.ok) ? cache.put(url, res) : null)
            .catch(err => console.warn('[SW] Could not cache', url, err))
        )
      )
    )
  );

  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isNavigation = req.mode === 'navigate';
  const isCritical = isNavigation || NETWORK_FIRST.includes(url.pathname);

  if (isCritical) {
    // NETWORK-FIRST: uvijek pokušaj svježu verziju, cache samo kad nema mreže
    const cacheKey = isNavigation ? '/index.html' : url.pathname;

    event.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then(res => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(cacheKey, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(cacheKey).then(cached => cached || caches.match('/') || Response.error())
        )
    );
    return;
  }

  // CACHE-FIRST za slike i ostalo (rijetko se mijenja)
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;

      return fetch(req).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        }
        return res;
      });
    })
  );
});
