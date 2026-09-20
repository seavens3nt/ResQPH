import type { SeverityLevel } from '../../../../features/missions/types'
import { SEVERITY_CONFIG } from './severity'

export function SeverityTag({ severity }: { severity: SeverityLevel }) {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.moderate

  return (
    <span className={`severity-tag ${config.className}`}>
      {config.label} · {config.depth}
    </span>
  )
}
