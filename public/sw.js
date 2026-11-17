// __BUILD_ID__ lo reemplaza el build para que cada despliegue renueve la caché.
const CACHE_NAME = 'cuentas-claras-__BUILD_ID__';
const APP_SHELL = [
  './',
  './manifest.json',
  './icons/icon-192.png',
  './assets/logo.webp',
  './assets/angel.webp',
  './assets/nelson.webp',
  './fonts/roboto-400.woff2',
  './fonts/roboto-500.woff2',
  './fonts/roboto-700.woff2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // la API siempre va a la red; la app ya guarda su propia copia del historial
  if (url.pathname.startsWith('/api/')) return;

  const isPage = event.request.mode === 'navigate';
  const cacheKey = isPage ? './' : event.request;

  // stale-while-revalidate: responde al instante con lo guardado y actualiza
  // la copia en segundo plano para la próxima vez.
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(cacheKey, { ignoreSearch: isPage });
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok) cache.put(cacheKey, response.clone());
          return response;
        })
        .catch(() => cached);
      if (cached) {
        event.waitUntil(network);
        return cached;
      }
      return network;
    })
  );
});
