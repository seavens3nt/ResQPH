import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { QueryClientContext } from '@tanstack/react-query'
import { readSession, writeSession } from './session'
import type { ReactNode } from 'react'
import type { AuthUser, ProfileUpdate, UserRole } from './types'
import { isUserRole } from './types'

/*
 * Prototype-only client auth. This is NOT real authentication: it persists a
 * chosen profile to sessionStorage so the landing -> login -> dashboard flow can
 * be demonstrated without a backend identity service. No passwords are stored.
 * Phase 1 defers the real authentication decision (see docs/ROADMAP.md).
 */

interface AuthContextValue {
  user: AuthUser | null
  login: (input: { email: string; role: UserRole; name?: string; teamId?: string }) => void
  signup: (input: ProfileUpdate & { role: UserRole; locationPermission?: boolean }) => void
  updateProfile: (input: ProfileUpdate) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function nameFromEmail(email: string): string {
  const handle = email.split('@')[0] ?? 'Responder'
  return handle
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Responder'
}

function demoActorIdFor(email: string): string {
  const normalized = email.trim().toLowerCase()
  const handle = normalized.split('@')[0] ?? normalized
  if (handle.includes('alpha')) return 'team-alpha'
  if (handle.includes('bravo')) return 'team-bravo'
  if (handle.includes('charlie')) return 'team-charlie'
  return normalized
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readSession)
  const queryClient = useContext(QueryClientContext)
  const save = useCallback((next: AuthUser | null) => {
    if (next && !isUserRole(next.role)) next = null
    writeSession(next)
    queryClient?.clear()
    setUser(next)
  }, [queryClient])

  const login = useCallback<AuthContextValue['login']>(({ email, role, name, teamId }) => {
    const normalizedEmail = email.trim().toLowerCase()
    const mappedActorId = demoActorIdFor(normalizedEmail)
    const resolvedTeamId = role === 'rescuer' ? teamId ?? mappedActorId : undefined
    save({
      email: normalizedEmail,
      role,
      teamId: resolvedTeamId,
      demoActorId: resolvedTeamId ?? normalizedEmail,
      name: name?.trim() || nameFromEmail(email),
    })
  }, [save])

  const signup = useCallback<AuthContextValue['signup']>(({
    name,
    email,
    role,
    phone,
    avatarUrl,
    emergencyContact,
    medicalInfo,
    locationPermission,
  }) => {
    save({
      name: name.trim() || nameFromEmail(email),
      email: email.trim().toLowerCase(),
      role,
      demoActorId: role === 'rescuer' ? demoActorIdFor(email) : email.trim().toLowerCase(),
      teamId: role === 'rescuer' ? demoActorIdFor(email) : undefined,
      phone: phone?.trim() || undefined,
      avatarUrl: avatarUrl || undefined,
      emergencyContact: emergencyContact ?? undefined,
      medicalInfo: medicalInfo ?? undefined,
      locationPermission: locationPermission ?? false,
    })
  }, [save])

  const updateProfile = useCallback<AuthContextValue['updateProfile']>((input) => {
    save(user
        ? {
            ...user,
            ...input,
            name: input.name.trim() || user.name,
            email: user.email,
            demoActorId: user.role === 'rescuer' ? user.teamId ?? demoActorIdFor(user.email) : user.email,
          }
        : user,
    )
  }, [save, user])

  const logout = useCallback(() => save(null), [save])

  const value = useMemo(
    () => ({ user, login, signup, updateProfile, logout }),
    [user, login, signup, updateProfile, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
