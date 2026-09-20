import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { AuthUser, ProfileUpdate, UserRole } from './types'

/*
 * Prototype-only client auth. This is NOT real authentication: it persists a
 * chosen profile to localStorage so the landing -> login -> dashboard flow can
 * be demonstrated without a backend identity service. No passwords are stored.
 * Phase 1 defers the real authentication decision (see docs/ROADMAP.md).
 */

const STORAGE_KEY = 'resqph.auth.user'

interface AuthContextValue {
  user: AuthUser | null
  login: (input: { email: string; role: UserRole; name?: string }) => void
  signup: (input: ProfileUpdate & { role: UserRole; locationPermission?: boolean }) => void
  updateProfile: (input: ProfileUpdate) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readStored(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthUser
    if (parsed?.email && parsed?.role) return parsed
    return null
  } catch {
    return null
  }
}

function nameFromEmail(email: string): string {
  const handle = email.split('@')[0] ?? 'Responder'
  return handle
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Responder'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStored())

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [user])

  const login = useCallback<AuthContextValue['login']>(({ email, role, name }) => {
    setUser({ email, role, name: name?.trim() || nameFromEmail(email) })
  }, [])

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
    setUser({
      name: name.trim() || nameFromEmail(email),
      email: email.trim(),
      role,
      phone: phone?.trim() || undefined,
      avatarUrl: avatarUrl || undefined,
      emergencyContact: emergencyContact ?? undefined,
      medicalInfo: medicalInfo ?? undefined,
      locationPermission: locationPermission ?? false,
    })
  }, [])

  const updateProfile = useCallback<AuthContextValue['updateProfile']>((input) => {
    setUser((current) =>
      current
        ? {
            ...current,
            ...input,
            name: input.name.trim() || current.name,
            email: input.email.trim() || current.email,
          }
        : current,
    )
  }, [])

  const logout = useCallback(() => setUser(null), [])

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
