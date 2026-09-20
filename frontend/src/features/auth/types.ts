export type UserRole = 'citizen' | 'coordinator' | 'rescuer'

export interface EmergencyContact {
  name: string
  relationship: string
  phone: string
}

export interface MedicalInfo {
  conditions?: string
  allergies?: string
  specialAssistance?: string
}

export interface AuthUser {
  name: string
  email: string
  role: UserRole
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
  coordinator: 'Coordinator',
  rescuer: 'Rescuer',
}

export const ROLE_BLURB: Record<UserRole, string> = {
  citizen: 'Submit and track rescue requests for people who need help.',
  coordinator: 'Monitor requests, assign teams, and manage operations.',
  rescuer: 'Receive missions, follow flood-aware routes, and report back.',
}
