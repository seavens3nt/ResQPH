import { createContext, useContext } from 'react'
import type { FloodLevel, VulnerabilityTag } from '../requests/types'

export interface CitizenRequestDraft {
  address: string
  landmark: string
  lngStr: string
  latStr: string
  locationSource: 'gps' | 'demo' | 'map'
  locationConfirmed: boolean
  headcountStr: string
  vulnerabilities: VulnerabilityTag[]
  medicalNeeds: boolean
  medicalDetails: string
  situationSummary: string
  floodLevel: FloodLevel
  reportedSeverity: 'low' | 'moderate' | 'high' | 'critical'
}

export const CitizenDraftContext = createContext<{
  draft: CitizenRequestDraft | null
  saveDraft: (draft: CitizenRequestDraft | null) => void
} | null>(null)

// Legacy standalone forms do not require a dashboard provider.
export function useCitizenDraft() {
  return useContext(CitizenDraftContext)
}
