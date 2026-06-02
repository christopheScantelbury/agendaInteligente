// Bump CACHE_NAME a cada release pra invalidar o cache do client.
const CACHE_NAME = 'agenda-inteligente-v31-2026-05-30-ios-no-zoom'
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
]

// Aceita mensagem do client pedindo pra promover o SW novo (BUG-CHUNK-01)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Instalação do Service Worker — skipWaiting força ativação imediata
self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aberto')
        return cache.addAll(urlsToCache)
      })
  )
})

// Ativação do Service Worker — claim toma controle de clients já abertos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Removendo cache antigo:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      ),
      self.clients.claim(),
    ])
  )
})

// Estratégia: Network First, fallback para Cache
// IMPORTANTE: nunca cacheia chamadas API/auth — só estáticos. Caso contrário
// um GET com bug retornando [] fica preso no client até reload manual.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  const isApi = url.pathname.startsWith('/api') || url.pathname.startsWith('/auth')

  if (isApi || event.request.method !== 'GET') {
    // Bypass total do SW — vai direto à rede, sem cachear
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseToCache = response.clone()
        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache)
          })
        return response
      })
      .catch(() => caches.match(event.request))
  )
})
