/* Production UI shell only. Public build files must remain available during an origin outage.
 * Never cache API responses, map tiles, or private data. */
const CACHE = 'resqph-ui-shell-v2'
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
  const readCached = async () => {
    try {
      const cache = await caches.open(CACHE)
      // Vite can add Vary: Origin. Precache requests and module requests carry
      // different Origin headers, but these public, content-hashed files are
      // identical. Never apply this relaxation to API or private resources.
      return await cache.match(navigation ? '/index.html' : event.request, { ignoreVary: true })
    } catch {
      // Browser storage can be denied or unavailable independently of the network.
      return undefined
    }
  }
  event.respondWith((async () => {
    // Build filenames are content-hashed. A cached copy is already the exact
    // requested version and must not wait for an unreachable origin to time out.
    if (asset) {
      const cached = await readCached()
      if (cached) return cached
    }
    try {
      const response = await fetch(event.request)
      if (response.ok && asset) {
        const copy = response.clone()
        event.waitUntil((async () => {
          try {
            const cache = await caches.open(CACHE)
            await cache.put(event.request, copy)
          } catch {
            // Caching is best effort: never fail a successful application response.
          }
        })())
      }
      if (!response.ok) return (await readCached()) || response
      return response
    } catch (error) {
      const cached = await readCached()
      if (cached) return cached
      throw error
    }
  })())
})
