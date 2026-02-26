// Service Worker for Plinkit — offline caching
const CACHE_NAME = 'plinkit-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/assets/audio/sprites.ogg',
  '/assets/audio/sprites.mp3',
];

// Install — cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {
        // Some assets may not exist yet; cache what we can
        return Promise.allSettled(
          ASSETS_TO_CACHE.map((url) => cache.add(url).catch(() => {}))
        );
      });
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — network-first strategy
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful GET requests for offline fallback
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed — fall back to cache
        return caches.match(event.request);
      })
  );
});
