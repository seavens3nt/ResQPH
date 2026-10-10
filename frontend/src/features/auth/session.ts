import type { AuthUser } from './types'
import { isUserRole } from './types'

export const SESSION_KEY = 'resqph.auth.user'
export const TEAM_IDS = ['team-alpha', 'team-bravo', 'team-charlie'] as const
// Independently opened tabs start empty. Duplicated tabs may copy sessionStorage,
// but subsequent entry/sign-out changes remain isolated. Never read localStorage.
export function readSession(): AuthUser | null {
  try {
    const user = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null') as AuthUser | null
    if (!user || !user.email || !user.name || !isUserRole(user.role)) {
      sessionStorage.removeItem(SESSION_KEY)
      return null
    }
    if (user.role === 'rescuer' && !TEAM_IDS.includes(user.teamId as typeof TEAM_IDS[number])) return null
    return user
  } catch { return null }
}
export function actorId(user: AuthUser): string { return user.role === 'rescuer' ? user.teamId! : user.email }
export function writeSession(user: AuthUser | null) {
  if (user) sessionStorage.setItem(SESSION_KEY, JSON.stringify(user))
  else sessionStorage.removeItem(SESSION_KEY)
}
