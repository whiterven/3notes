const CACHE_NAME = 'stickon-ai-cache-v2'; // Incremented version to ensure update
const urlsToCache = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Kalam&display=swap',
  'https://fonts.gstatic.com/s/kalam/v16/YA9dr0Wd4deuI3Qo__s.woff2',
];

self.addEventListener('install', event => {
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching core assets');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('Failed to cache during install:', err);
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Tell the active service worker to take control of the page immediately.
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Don't cache Supabase API calls or dynamic esm.sh modules. Let them go to the network.
  if (url.hostname.includes('supabase.co') || url.hostname.includes('esm.sh')) {
    return;
  }

  // Use a stale-while-revalidate strategy for all other assets.
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(request).then(cachedResponse => {
        const fetchPromise = fetch(request).then(networkResponse => {
          // Check for a valid response to cache
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(err => {
          console.error('Fetch failed; returning offline fallback or cached response.', err);
          // If fetch fails and we have a cached response, we'll serve it.
          // Otherwise, the browser's default offline mechanism will kick in.
        });

        // Return the cached response immediately if it exists, otherwise wait for the network.
        return cachedResponse || fetchPromise;
      });
    })
  );
});
