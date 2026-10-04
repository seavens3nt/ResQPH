import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const source = readFileSync(resolve(process.cwd(), 'public/offline-shell.js'), 'utf8')

function worker() {
  const handlers: Record<string, (event: object) => void> = {}
  const cache = { addAll: vi.fn(async () => {}), put: vi.fn(async () => {}), match: vi.fn(async () => 'cached-shell') }
  const response = { ok: true, text: async () => '<script src="/assets/app-hash.js"></script><link href="/assets/app-hash.css"><img src="https://tiles.example/image.png">', clone() { return this } }
  const fetch = vi.fn(async () => response)
  const self = { location: { origin: 'https://resqph.example' },
    addEventListener: (name: string, handler: (event: object) => void) => { handlers[name] = handler },
    skipWaiting: vi.fn(async () => {}), clients: { claim: vi.fn(async () => {}) } }
  runInNewContext(source, { self, caches: { open: async () => cache }, fetch, URL })
  return { handlers, cache, fetch }
}

describe('production offline UI shell', () => {
  it('installs only the index and referenced built assets, not map resources', async () => {
    const { handlers, cache } = worker()
    let installed: Promise<unknown> | undefined
    handlers.install({ waitUntil: (promise: Promise<unknown>) => { installed = promise } })
    await installed
    expect(cache.addAll).toHaveBeenCalledWith(['/assets/app-hash.js', '/assets/app-hash.css'])
    expect(cache.put).toHaveBeenCalledWith('/index.html', expect.anything())
  })

  it('does not intercept API, external tiles, POSTs or arbitrary resource requests', () => {
    const { handlers } = worker()
    for (const [url, method, mode] of [
      ['https://resqph.example/api/v1/missions', 'GET', 'navigate'],
      ['https://tiles.example/tile.png', 'GET', 'cors'],
      ['https://resqph.example/dashboard', 'POST', 'navigate'],
      ['https://resqph.example/private.json', 'GET', 'cors'],
    ]) {
      const respondWith = vi.fn()
      handlers.fetch({ request: { url, method, mode }, respondWith })
      expect(respondWith).not.toHaveBeenCalled()
    }
  })

  it('serves the cached UI for disconnected navigation without fabricating API data', async () => {
    const { handlers, cache, fetch } = worker()
    fetch.mockRejectedValueOnce(new Error('offline'))
    let response: Promise<unknown> | undefined
    handlers.fetch({ request: { url: 'https://resqph.example/dashboard', method: 'GET', mode: 'navigate' },
      respondWith: (promise: Promise<unknown>) => { response = promise } })
    await expect(response).resolves.toBe('cached-shell')
    expect(cache.match).toHaveBeenCalledWith('/index.html')
  })
})
