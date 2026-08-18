// Flora Garden Service Worker - High-Performance Image Caching Engine
const CACHE_NAME = 'flora-images-v1';

// Patterns of assets and images to cache
const IMAGE_DOMAINS = [
  'firebasestorage.googleapis.com',
  'images.unsplash.com',
  'cdn.jsdelivr.net'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  
  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Exclude API calls, Firestore, and auth endpoints from image caching
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com')
  ) {
    return;
  }

  // Check if request is an image
  const isImageRequest = 
    request.destination === 'image' ||
    /\.(png|jpe?g|webp|svg|gif|ico)(\?.*)?$/i.test(url.pathname) ||
    IMAGE_DOMAINS.some(domain => url.hostname.includes(domain) && (url.pathname.includes('/o/') || url.pathname.includes('photo-')));

  if (isImageRequest) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        // 1. Try cache first
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          // Return cached image immediately for instant loading
          return cachedResponse;
        }

        // 2. Fetch from network and cache the response
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          // If network fails and nothing in cache, propagate error or return fallback
          if (cachedResponse) return cachedResponse;
          throw error;
        }
      })
    );
  }
});
