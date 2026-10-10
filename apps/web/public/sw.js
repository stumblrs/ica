// Igbo Community Atlas - Service Worker
// Version: 1.3.0 (Updated: 2026-10-10 - Offline Field Mode & Dynamic Cache)
const CACHE_VERSION = 'ica-v1.3.0';
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
];

// Install Event: pre-cache application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

// Activate Event: purge stale cache versions and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_VERSION) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Message Event: listen for SKIP_WAITING from update notification prompt
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch Event: intelligent caching strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Bypass non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // 2. Dynamic API routes: Network-First with Cache Storage for offline field mode
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone and cache atlas dataset responses for field mode
          if (
            response.status === 200 &&
            (url.pathname.includes('/api/map/communities') ||
              url.pathname.includes('/api/communities') ||
              url.pathname.includes('/landmarks'))
          ) {
            const responseClone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          // Also try matching against field pack cache if present
          if ('caches' in self) {
            const fieldCache = await caches.open('ica-offline-field-pack');
            const fieldMatch = await fieldCache.match(event.request);
            if (fieldMatch) return fieldMatch;
          }
          return new Response(JSON.stringify({ error: 'Offline mode active, record not locally cached.' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 503,
          });
        })
    );
    return;
  }

  // 3. Navigation requests: Network-First with fallback to cached root
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        return caches.match('/');
      })
    );
    return;
  }

  // 4. Static assets (_next/static, images, fonts): Stale-While-Revalidate
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.open(CACHE_VERSION).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Default: Network with Cache Fallback
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
