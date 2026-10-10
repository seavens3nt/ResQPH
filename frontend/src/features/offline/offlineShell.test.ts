import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { URL } from 'node:url'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const source = readFileSync(resolve('public/offline-shell.js'), 'utf8')

function harness({ openFails = false, putFails = false, offline = false, status = 200 } = {}) {
  const listeners: Record<string, (event: unknown) => void> = {}
  const stored = new Map<string, Response>()
  const key = (request: string | Request) => typeof request === 'string' ? request : request.url
  const cache = {
    put: vi.fn(async (request: string | Request, response: Response) => {
      if (putFails) throw new Error('Quota exceeded')
      stored.set(key(request), response)
    }),
    match: vi.fn(async (request: string | Request) => stored.get(key(request))?.clone()),
    addAll: vi.fn(async () => undefined),
  }
  const fetch = vi.fn(async () => {
    if (offline) throw new Error('Network unavailable')
    return new Response('live application', { status, headers: { 'content-type': 'text/javascript' } })
  })
  runInNewContext(source, {
    URL, fetch,
    caches: { open: vi.fn(async () => { if (openFails) throw new Error('Storage denied'); return cache }) },
    self: { location: { origin: 'https://resqph.test' }, addEventListener: (name: string, handler: (event: unknown) => void) => { listeners[name] = handler }, clients: { claim: vi.fn() }, skipWaiting: vi.fn() },
  })
  function request(path = '/assets/app.js', mode = 'cors', method = 'GET') {
    let result: Promise<Response> | undefined
    const background: Promise<unknown>[] = []
    listeners.fetch({ request: { url: new URL(path, 'https://resqph.test').href, mode, method }, respondWith: (response: Promise<Response>) => { result = response }, waitUntil: (work: Promise<unknown>) => background.push(work) })
    return { result, background }
  }
  return { request, stored, fetch, cache, listeners }
}

describe('production offline shell', () => {
  it('precaches only the public shell and its build assets', async () => {
    const { listeners, cache, fetch } = harness()
    fetch.mockResolvedValueOnce(new Response('<script src="/assets/app.js"></script><link href="/assets/app.css"><img src="https://tiles.example/tile.png">'))
    let installed: Promise<unknown> | undefined
    listeners.install({ waitUntil: (work: Promise<unknown>) => { installed = work } })
    await installed
    expect(cache.addAll).toHaveBeenCalledWith(['/assets/app.js', '/assets/app.css'])
    expect(cache.put).toHaveBeenCalledWith('/index.html', expect.anything())
  })
  it('matches public build assets regardless of the precache Origin header', async () => {
    const { request, cache } = harness()
    await request().result
    expect(cache.match).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://resqph.test/assets/app.js' }), { ignoreVary: true })
  })
  it('serves an immutable cached asset without contacting the origin', async () => {
    const { request, stored, fetch } = harness()
    stored.set('https://resqph.test/assets/app.js', new Response('cached script'))
    expect(await (await request().result)!.text()).toBe('cached script')
    expect(fetch).not.toHaveBeenCalled()
  })
  it('delivers a successful network asset when browser cache cannot open', async () => {
    const { request } = harness({ openFails: true })
    expect(await (await request().result)!.text()).toBe('live application')
  })
  it('does not turn a quota failure into a failed script request', async () => {
    const { request } = harness({ putFails: true })
    const response = request()
    expect(await (await response.result)!.text()).toBe('live application')
    await Promise.all(response.background)
  })
  it('reopens the cached application shell without the server', async () => {
    const { request, stored } = harness({ offline: true })
    stored.set('/index.html', new Response('cached application'))
    expect(await (await request('/dashboard', 'navigate').result)!.text()).toBe('cached application')
  })
  it('uses an existing cached asset when the server returns an error', async () => {
    const { request, stored } = harness({ status: 503 })
    stored.set('https://resqph.test/assets/app.js', new Response('cached script'))
    expect(await (await request().result)!.text()).toBe('cached script')
  })
  it.each(['/api/v1/missions', '/tiles/1.png', 'https://tiles.example.test/1.png'])('never intercepts private API data or map tiles: %s', path => {
    expect(harness().request(path).result).toBeUndefined()
  })
  it('never intercepts a submission', () => {
    expect(harness().request('/api/v1/rescue-requests', 'cors', 'POST').result).toBeUndefined()
  })
  it('never intercepts navigation to an API or an arbitrary private resource', () => {
    expect(harness().request('/api/v1/missions', 'navigate').result).toBeUndefined()
    expect(harness().request('/private.json').result).toBeUndefined()
  })
})
