/** Issue #71 component-level checks for the production UI-shell worker. */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const source = readFileSync(resolve(process.cwd(), 'public/offline-shell.js'), 'utf8')

function createWorker() {
  const listeners: Record<string, (event: never) => void> = {}
  const cache = { addAll: vi.fn(async () => undefined), put: vi.fn(async () => undefined), match: vi.fn(async () => ({ source: 'cached' })) }
  const shell = { ok: true, clone() { return this }, text: async () => '<script src="/assets/app-issue71.js"></script><link href="/assets/app-issue71.css">' }
  const fetch = vi.fn(async () => shell)
  const self = {
    location: { origin: 'http://localhost:4173' },
    addEventListener: (name: string, handler: (event: never) => void) => { listeners[name] = handler },
    skipWaiting: vi.fn(async () => undefined), clients: { claim: vi.fn(async () => undefined) },
  }
  runInNewContext(source, { self, caches: { open: async () => cache }, fetch, URL })
  return { listeners, cache, fetch }
}

describe('Issue 71 production offline shell checks (mocked worker APIs)', () => {
  it('caches only the app shell and built JS/CSS during installation', async () => {
    const { listeners, cache } = createWorker()
    let completion: Promise<unknown> | undefined
    listeners.install({ waitUntil: (value: Promise<unknown>) => { completion = value } } as never)
    await completion

    expect(cache.addAll).toHaveBeenCalledWith(['/assets/app-issue71.js', '/assets/app-issue71.css'])
    expect(cache.put).toHaveBeenCalledWith('/index.html', expect.anything())
  })

  it('restores a cached navigation after a network failure with the original app shell', async () => {
    const { listeners, cache, fetch } = createWorker()
    fetch.mockRejectedValueOnce(new Error('offline'))
    let result: Promise<unknown> | undefined
    listeners.fetch({ request: { url: 'http://localhost:4173/dashboard', method: 'GET', mode: 'navigate' },
      respondWith: (value: Promise<unknown>) => { result = value } } as never)

    await expect(result).resolves.toEqual({ source: 'cached' })
    expect(cache.match).toHaveBeenCalledWith('/index.html', { ignoreVary: true })
  })

  it('leaves API requests, tiles, POSTs, and non-navigation data out of the cache', () => {
    const { listeners } = createWorker()
    const forbiddenToCache = [
      ['http://localhost:4173/api/v1/missions', 'GET', 'cors'],
      ['http://localhost:4173/api/v1/missions', 'GET', 'navigate'],
      ['https://tiles.example/7/31/45.png', 'GET', 'cors'],
      ['http://localhost:4173/api/v1/missions/1/status-events', 'POST', 'cors'],
      ['http://localhost:4173/private.json', 'GET', 'cors'],
    ] as const
    for (const [url, method, mode] of forbiddenToCache) {
      const respondWith = vi.fn()
      listeners.fetch({ request: { url, method, mode }, respondWith } as never)
      expect(respondWith).not.toHaveBeenCalled()
    }
  })

  it('falls back to the original cached build asset after a network failure', async () => {
    const { listeners, cache, fetch } = createWorker()
    fetch.mockRejectedValueOnce(new Error('offline'))
    const request = { url: 'http://localhost:4173/assets/app-issue71.js', method: 'GET', mode: 'cors' }
    let result: Promise<unknown> | undefined
    listeners.fetch({ request, respondWith: (value: Promise<unknown>) => { result = value } } as never)
    await expect(result).resolves.toEqual({ source: 'cached' })
    expect(cache.match).toHaveBeenCalledWith(request, { ignoreVary: true })
  })

  it('does not invent a shell if the network and cache are both unavailable', async () => {
    const { listeners, cache, fetch } = createWorker()
    fetch.mockRejectedValueOnce(new Error('offline without cache'))
    cache.match.mockResolvedValueOnce(undefined as never)
    let result: Promise<unknown> | undefined
    listeners.fetch({ request: { url: 'http://localhost:4173/dashboard', method: 'GET', mode: 'navigate' },
      respondWith: (value: Promise<unknown>) => { result = value } } as never)
    await expect(result).rejects.toThrow('offline without cache')
  })
})
