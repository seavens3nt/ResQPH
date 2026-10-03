import { useId } from 'react'
import './RouteSummary.css'

export interface RouteWarningsProps {
  warnings?: readonly string[]
  fallbackUsed?: boolean
  mlContribution?: number
}

export function RouteWarnings({
  warnings = [],
  fallbackUsed = false,
  mlContribution,
}: RouteWarningsProps) {
  const headingId = useId()
  if (!fallbackUsed && warnings.length === 0) return null

  return (
    <section className="route-summary__section" aria-labelledby={headingId}>
      <h3 id={headingId}>Route notices</h3>
      {fallbackUsed && (
        <p className="route-summary__fallback" role="status">
          Deterministic rule-based fallback was used.
          {mlContribution === 0 ? ' ML contribution: 0 cost units.' : ''}
        </p>
      )}
      {warnings.length > 0 && (
        <ul className="route-summary__warnings">
          {warnings.map((warning, index) => (
            <li key={`${warning}-${index}`}>{warning}</li>
          ))}
        </ul>
      )}
    </section>
  )
}
