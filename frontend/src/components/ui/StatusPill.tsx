import './StatusPill.css'

export type StatusTone = 'online' | 'offline' | 'pending' | 'stale'

interface StatusPillProps {
  tone: StatusTone
  label: string
  /** Optional monospace detail shown after the label, e.g. a version or code. */
  detail?: string
}

/**
 * Telemetry-style connectivity indicator. The pulsing dot reads like a
 * live signal at a rescue console. Reused wherever a link/state is shown.
 */
export function StatusPill({ tone, label, detail }: StatusPillProps) {
  return (
    <span className={`status-pill status-pill--${tone}`} role="status">
      <span className="status-pill__dot" aria-hidden="true" />
      <span className="status-pill__label">{label}</span>
      {detail ? <span className="status-pill__detail">{detail}</span> : null}
    </span>
  )
}
