const CACHE_NAME = 'unibites-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // In development, some assets might fail to load if they don't exist yet,
      // so we use an addAll that ignores missing files if necessary or just cache what we can
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('Algunos recursos iniciales no se pudieron cachear durante la instalación:', err);
      });
    })
  );
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
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Evitar interceptar o cachear peticiones que no sean GET, llamadas a la API o conexiones de WebSockets
  if (
    event.request.method !== 'GET' ||
    event.request.url.includes('/api/') ||
    event.request.url.includes('/ws') ||
    event.request.url.startsWith('ws')
  ) {
    return;
  }

  // Solo interceptar peticiones del mismo origen para no romper llamadas externas
  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((response) => {
          // Guardar respuestas válidas en caché
          if (response.status === 200 && response.type === 'basic') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        }).catch(() => {
          // Fallback silencioso si no hay red
          return caches.match('/index.html');
        });
      })
    );
  }
});
