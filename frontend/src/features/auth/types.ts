export type UserRole = 'citizen' | 'rescuer'

export function isUserRole(value: unknown): value is UserRole {
  return value === 'citizen' || value === 'rescuer'
}

export interface EmergencyContact {
  name: string
  address?: string
  relationship: string
  phone: string
}

export interface MedicalInfo {
  conditions?: string
  allergies?: string
  specialAssistance?: string
}

export interface AuthUser {
  id?: string
  teamId?: string
  stationId?: string
  stationName?: string
  stationAddress?: string
  name: string
  email: string
  role: UserRole
  demoActorId?: string
  avatarUrl?: string
  phone?: string
  emergencyContact?: EmergencyContact
  medicalInfo?: MedicalInfo
  locationPermission?: boolean
}

export type ProfileUpdate = {
  name: string
  email: string
  phone?: string
  avatarUrl?: string
  emergencyContact?: EmergencyContact
  medicalInfo?: MedicalInfo
}

export const ROLE_LABELS: Record<UserRole, string> = {
  citizen: 'Citizen',
  rescuer: 'Rescuer',
}

export const ROLE_BLURB: Record<UserRole, string> = {
  citizen: 'Submit and track rescue requests for people who need help.',
  rescuer: 'Receive missions, follow flood-aware routes, and report back.',
}
