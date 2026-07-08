// Bump CACHE_NAME a cada release pra invalidar o cache do client.
const CACHE_NAME = 'agenda-inteligente-v90-2026-07-07-week-timeline-servico-cards'
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
]

// B-NEW-3: chunks com hash imutavel no nome (Vite default) NUNCA devem ser
// cacheados pelo SW. Apos um deploy novo, os hashes mudam — se o SW serve
// chunk velho ou tenta fallback pra cache que nao existe, dispara
// "Failed to fetch dynamically imported module" e a aplicacao trava.
// Padroes do Vite: foo-Abcd1234.js, vendor-X9y8z7w6.css
const HASHED_ASSET_PATTERN = /\/assets\/[^/]+-[A-Za-z0-9_-]{6,}\.(js|css|woff2?|ttf|otf|map)$/

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

// Estratégia: Network First, fallback para Cache (apenas pra HTML/manifest).
// Regras:
// - API/auth: bypass total (cliente trata cache)
// - Assets hashados (chunks lazy do Vite): network-only, NUNCA cacheia nem
//   tenta fallback. Após deploy do Vercel os hashes mudam e o cache antigo
//   serve chunks que nao existem mais (B-NEW-3).
// - Resto (HTML, manifest, imagens estaticas): network-first com fallback cache.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  const isApi = url.pathname.startsWith('/api') || url.pathname.startsWith('/auth')

  if (isApi || event.request.method !== 'GET') {
    // Bypass total do SW — vai direto à rede, sem cachear
    return
  }

  // B-NEW-3: chunks lazy hashados sempre network-only (sem cache, sem fallback).
  // Se a rede falhar, deixa o browser disparar o erro nativo pra que o
  // ErrorBoundary do app detecte e force reload com cache limpo.
  if (HASHED_ASSET_PATTERN.test(url.pathname)) {
    event.respondWith(fetch(event.request))
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
