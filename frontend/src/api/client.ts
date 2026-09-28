import axios from 'axios'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1',
  timeout: 10_000,
})

// Inject prototype demo-role headers from the auth session stored by AuthContext.
// These are a non-production control and must never be used as real authentication.
apiClient.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('resqph.auth.user')
    if (raw) {
      const user = JSON.parse(raw) as { role?: string; email?: string }
      if (user.role) config.headers['X-Demo-Role'] = user.role
      if (user.email) config.headers['X-Demo-User-Id'] = user.email
    }
  } catch {
    // localStorage unavailable or malformed — proceed without headers
  }
  return config
})
