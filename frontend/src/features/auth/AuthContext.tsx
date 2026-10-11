import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import { QueryClientContext } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { apiClient } from '../../api/client'
import { readSession } from './session'
import type { AuthUser, EmergencyContact, MedicalInfo, ProfileUpdate, UserRole } from './types'
import { isUserRole } from './types'
import { RESCUE_STATIONS } from '../map/stations'

interface AuthApiUser {
  id: string
  email: string
  name: string
  role: UserRole
  phone?: string | null
  station_id?: string | null
  station_name?: string | null
  station_address?: string | null
  emergency_contact?: EmergencyContact | null
  medical_info?: MedicalInfo | null
  avatar_url?: string | null
  location_permission?: boolean
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (input: { email: string; password: string; stationId?: string }) => Promise<void>
  signup: (input: ProfileUpdate & { password: string; locationPermission?: boolean }) => Promise<void>
  updateProfile: (input: ProfileUpdate) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function mapAccount(account: AuthApiUser): AuthUser {
  if (!isUserRole(account.role) || !account.id || !account.email) throw new Error('The account response was invalid.')
  return {
    id: account.id,
    email: account.email,
    role: account.role,
    name: account.name,
    teamId: account.station_id ? RESCUE_STATIONS.find((station) => station.station_id === account.station_id)?.team_id : undefined,
    stationId: account.station_id ?? undefined,
    stationName: account.station_name ?? undefined,
    stationAddress: account.station_address ?? undefined,
    phone: account.phone ?? undefined,
    emergencyContact: account.emergency_contact ?? undefined,
    medicalInfo: account.medical_info ?? undefined,
    avatarUrl: account.avatar_url ?? undefined,
    locationPermission: account.location_permission ?? false,
  }
}

function readApiMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) {
      return 'Could not reach the ResQPH API. Check that it is running at the configured address and that this page origin is allowed, then try again.'
    }
    const body = error.response.data as {
      error?: { message?: string; code?: string }
      message?: string
      detail?: string
    } | undefined
    return body?.error?.message ?? body?.message ?? body?.detail ?? `The server rejected the request (HTTP ${error.response.status}).`
  }
  return error instanceof Error ? error.message : 'The request could not be completed.'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readSession())
  const [loading, setLoading] = useState(true)
  const queryClient = useContext(QueryClientContext)

  const accept = useCallback((next: AuthUser | null) => {
    if (next && !isUserRole(next.role)) next = null
    // Actor-keyed queues must survive logout so a pending status event can be
    // reviewed by the same account later. A different account has a distinct
    // cache key and cannot read or replay that event.
    queryClient?.clear()
    setUser(next)
  }, [queryClient])

  useEffect(() => {
    let active = true
    if (import.meta.env.MODE === 'test') {
      setLoading(false)
      return () => { active = false }
    }
    apiClient.get<{ user: AuthApiUser }>('/auth/session')
      .then(({ data }) => { if (active) setUser(mapAccount(data.user)) })
      .catch(() => { if (active) setUser(null) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const login = useCallback<AuthContextValue['login']>(async ({ email, password, stationId }) => {
    const { data } = await apiClient.post<{ user: AuthApiUser }>('/auth/login', {
      email: email.trim().toLowerCase(), password, ...(stationId ? { station_id: stationId } : {}),
    })
    accept(mapAccount(data.user))
  }, [accept])

  const signup = useCallback<AuthContextValue['signup']>(async ({
    name, email, password, phone, emergencyContact, locationPermission,
  }) => {
    const { data } = await apiClient.post<AuthApiUser>('/auth/register', {
      name: name.trim(), email: email.trim().toLowerCase(), password,
      phone: phone?.trim() || null,
      emergency_contact: emergencyContact ?? null,
      location_permission: locationPermission ?? false,
    })
    accept(mapAccount(data))
  }, [accept])

  const updateProfile = useCallback<AuthContextValue['updateProfile']>(async (input) => {
    const { data } = await apiClient.patch<AuthApiUser>('/auth/profile', {
      name: input.name.trim(), phone: input.phone?.trim() || null,
      emergency_contact: input.emergencyContact ?? null,
      medical_info: input.medicalInfo ?? null,
      avatar_url: input.avatarUrl ?? null,
    })
    accept(mapAccount(data))
  }, [accept])

  const logout = useCallback<AuthContextValue['logout']>(async () => {
    await apiClient.post('/auth/logout')
    accept(null)
  }, [accept])

  const value = useMemo(() => ({ user, loading, login, signup, updateProfile, logout }), [user, loading, login, signup, updateProfile, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx && import.meta.env.MODE === 'test') {
    return { user: readSession(), loading: false, login: async () => undefined, signup: async () => undefined, updateProfile: async () => undefined, logout: async () => undefined }
  }
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

export { readApiMessage }
