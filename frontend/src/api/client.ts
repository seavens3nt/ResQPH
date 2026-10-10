import axios from 'axios'
import { actorId, readSession } from '../features/auth/session'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  timeout: 10_000,
  withCredentials: true,
})

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
  if (!['get', 'head', 'options'].includes(method)) {
    const token = csrfCookie()
    if (token) config.headers['X-CSRF-Token'] = token
  }
  return config
})
