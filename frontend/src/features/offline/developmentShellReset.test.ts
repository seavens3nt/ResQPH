import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { expect, it, vi } from 'vitest'

it('retires only UI shell caches and reloads controlled pages without touching account or mission storage', async () => {
  const listeners: Record<string, (event: { waitUntil: (work: Promise<unknown>) => void }) => void> = {}
  const navigate = vi.fn(async (_url: string) => undefined)
  const unregister = vi.fn(async () => true)
  const remove = vi.fn(async (_name: string) => true)
  runInNewContext(readFileSync(resolve('dev/offline-shell-reset.js'), 'utf8'), {
    self: {
      addEventListener: (name: string, handler: typeof listeners[string]) => { listeners[name] = handler },
      skipWaiting: vi.fn(async () => undefined),
      clients: {
        claim: vi.fn(async () => undefined),
        matchAll: vi.fn(async () => [{ url: 'http://localhost:5173/dashboard', navigate }]),
      },
      registration: { unregister },
    },
    caches: { keys: async () => ['resqph-ui-shell-v1', 'resqph-ui-shell-v2', 'unrelated-cache'], delete: remove },
  })
  let completion: Promise<unknown> | undefined
  listeners.activate({ waitUntil: work => { completion = work } })
  await completion
  expect(remove.mock.calls.map(([name]) => name)).toEqual(['resqph-ui-shell-v1', 'resqph-ui-shell-v2'])
  expect(unregister).toHaveBeenCalledOnce()
  expect(navigate).toHaveBeenCalledWith('http://localhost:5173/dashboard')
})
