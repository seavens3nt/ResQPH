/* Production UI shell only. Never cache API responses, map tiles, or private data. */
const CACHE = 'resqph-ui-shell-v1'
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const response = await fetch('/index.html', { cache: 'reload' })
    if (!response.ok) throw new Error('Application shell unavailable')
    const html = await response.clone().text()
    const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g)].map((match) => match[1])
    const cache = await caches.open(CACHE)
    await cache.addAll(assets)
    await cache.put('/index.html', response)
    await self.skipWaiting()
  })())
})
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return
  // Strict allow-list: navigation plus immutable build assets, never /api or tiles.
  const navigation = event.request.mode === 'navigate' && !url.pathname.startsWith('/api/')
  const asset = /^\/assets\/[^/]+\.(js|css)$/.test(url.pathname)
  if (!navigation && !asset) return
  event.respondWith((async () => {
    const cache = await caches.open(CACHE)
    try {
      const response = await fetch(event.request)
      if (response.ok && asset) await cache.put(event.request, response.clone())
      return response
    } catch (error) {
      const cached = await cache.match(navigation ? '/index.html' : event.request)
      if (cached) return cached
      throw error
    }
  })())
})
