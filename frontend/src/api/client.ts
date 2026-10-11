import axios, { CanceledError } from 'axios'
import { actorId, readSession } from '../features/auth/session'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  timeout: 10_000,
  withCredentials: true,
})
let expectedAccountId: string | undefined
let generation = 0
let sessionBlocked = false
const pending = new Set<AbortController>()
const recoveryListeners = new Set<(message: string) => void>()
export function onSessionRecovery(listener: (message: string) => void) {
  recoveryListeners.add(listener)
  return () => { recoveryListeners.delete(listener) }
}
function cancelOldRequests() {
  generation += 1
  for (const controller of pending) controller.abort()
  pending.clear()
}
export function setExpectedAccountId(id?: string): void {
  if (id !== expectedAccountId) cancelOldRequests()
  expectedAccountId = id
  sessionBlocked = false
}


function isSessionEntry(url?: string): boolean { return ['/auth/login','/auth/register','/auth/session'].includes(url ?? '') }

function csrfCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined
  const entry = document.cookie.split('; ').find((part) => part.startsWith('resqph_csrf='))
  return entry ? decodeURIComponent(entry.slice('resqph_csrf='.length)) : undefined
}

apiClient.interceptors.request.use((config) => {
  if (import.meta.env.MODE === 'test') {
    const testActor = readSession()
    if (testActor) {
      config.headers['X-Demo-Role'] = testActor.role
      config.headers['X-Demo-User-Id'] = actorId(testActor)
    }
  }
  const method = (config.method ?? 'get').toLowerCase()
  if (!isSessionEntry(config.url)) {
    if (sessionBlocked) throw new CanceledError('Sign in to restore this account.')
    if (expectedAccountId) config.headers['X-Expected-Account-Id'] = expectedAccountId
    const controller = new AbortController()
    pending.add(controller)
    const originalSignal = config.signal
    if (originalSignal?.aborted) controller.abort()
    else originalSignal?.addEventListener?.('abort', () => controller.abort(), { once: true })
    config.signal = controller.signal
    Object.assign(config, { accountGeneration: generation, accountController: controller })
  } else if (config.url === '/auth/session') {
    Object.assign(config, { accountGeneration: generation })
  }
  if (!['get', 'head', 'options'].includes(method)) {
    const token = csrfCookie()
    if (token) config.headers['X-CSRF-Token'] = token
  }
  return config
})

type ScopedConfig = { accountGeneration?: number; accountController?: AbortController; url?: string }
function finish(config?: ScopedConfig) {
  if (config?.accountController) pending.delete(config.accountController)
  if (config?.accountGeneration !== undefined && config.accountGeneration !== generation) {
    throw new CanceledError('Obsolete account response ignored.')
  }
}
apiClient.interceptors.response.use(response => {
  finish(response.config as ScopedConfig)
  return response
}, error => {
  finish(error.config as ScopedConfig)
  const config = error.config as ScopedConfig | undefined
  if (!isSessionEntry(config?.url) && !sessionBlocked &&
      (error.response?.status === 401 || error.response?.data?.error?.code === 'session_identity_changed')) {
    sessionBlocked = true
    cancelOldRequests()
    const message = error.response?.status === 401
      ? 'Your session expired. Sign in again to restore your workspace.'
      : 'This browser profile changed accounts. Sign in explicitly to restore your workspace. Tabs share cookies; use separate browser profiles for simultaneous citizen and rescuer testing.'
    for (const listener of recoveryListeners) listener(message)
  }
  return Promise.reject(error)
})
