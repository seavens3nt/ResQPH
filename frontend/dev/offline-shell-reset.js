// Served only by Vite development middleware at the old offline worker URL.
// Keep cookies, account storage and offline mission records intact.
self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting())
})
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await self.clients.claim()
    const names = await caches.keys()
    await Promise.all(names.filter(name => name.startsWith('resqph-ui-shell-')).map(name => caches.delete(name)))
    await self.registration.unregister()
    const pages = await self.clients.matchAll({ type: 'window' })
    await Promise.all(pages.map(page => page.navigate(page.url)))
  })())
})
