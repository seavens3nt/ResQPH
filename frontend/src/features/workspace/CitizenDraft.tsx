import { useState, type ReactNode } from 'react'
import { CitizenDraftContext, type CitizenRequestDraft } from './CitizenDraftContext'

/** Tab-local, memory-only draft. Nothing is written to disk or shared between actors. */
export function CitizenDraftProvider({ children }: { children: ReactNode }) {
  const [draft, saveDraft] = useState<CitizenRequestDraft | null>(null)
  return <CitizenDraftContext.Provider value={{ draft, saveDraft }}>{children}</CitizenDraftContext.Provider>
}
