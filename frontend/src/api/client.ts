import axios from 'axios'
import { actorId, readSession } from '../features/auth/session'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1',
  timeout: 10_000,
})

// Inject prototype demo-role headers from the auth session stored by AuthContext.
// These are a non-production control and must never be used as real authentication.
apiClient.interceptors.request.use((config) => {
  try {
    const user = readSession()
    if (user) {
      config.headers['X-Demo-Role'] = user.role
      config.headers['X-Demo-User-Id'] = actorId(user)
    } else {
      delete config.headers['X-Demo-Role']
      delete config.headers['X-Demo-User-Id']
    }
  } catch {
    // localStorage unavailable or malformed — proceed without headers
  }
  return config
})
