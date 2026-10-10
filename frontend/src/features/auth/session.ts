import type { AuthUser } from './types'

/** Legacy role simulation is discarded; the server's HttpOnly cookie owns session state. */
export function readSession(): AuthUser | null {
  if (import.meta.env.MODE === 'test') {
    try {
      const user = JSON.parse(sessionStorage.getItem('resqph.auth.user') ?? 'null') as AuthUser | null
      if (!user || !user.email || !user.name || !['citizen', 'rescuer', 'coordinator'].includes(user.role)) {
        sessionStorage.removeItem('resqph.auth.user')
        return null
      }
      if (user.role === 'rescuer' && !user.teamId) {
        sessionStorage.removeItem('resqph.auth.user')
        return null
      }
      return user
    } catch { return null }
  }
  try {
    sessionStorage.removeItem('resqph.auth.user')
  } catch {
    // Storage may be unavailable; cookie restoration remains authoritative.
  }
  return null
}

export function actorId(user: AuthUser): string {
  return user.id ?? user.email
}

export function writeSession(user: AuthUser | null): void {
  if (import.meta.env.MODE === 'test') {
    if (user) sessionStorage.setItem('resqph.auth.user', JSON.stringify(user))
    else sessionStorage.removeItem('resqph.auth.user')
    return
  }
  readSession()
}
