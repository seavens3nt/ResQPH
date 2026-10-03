import { useId } from 'react'
import type { NoRouteResult } from '../types'
import './RouteSummary.css'

export interface NoRouteStateProps {
  result: NoRouteResult
  stale?: boolean
}

export function NoRouteState({ result, stale = false }: NoRouteStateProps) {
  const headingId = useId()
  return (
    <section
      className="route-summary__no-route"
      role={stale ? 'status' : 'alert'}
      aria-labelledby={headingId}
    >
      <h2 id={headingId}>
        {stale
          ? 'Previously recorded: no eligible route under this controlled scenario'
          : 'No eligible route under this controlled scenario'}
      </h2>
      <p>
        No eligible route was returned. No substitute path has been evaluated or shown.
      </p>
      <p className="route-summary__next-step">
        Review the request inputs or controlled scenario before submitting another request. This
        result does not establish that another path is safe.
      </p>
      <p>
        <strong>Result reason:</strong>{' '}
        <span>{result.reason.replaceAll('_', ' ')}</span>
      </p>
      {result.scenario_timestamp && (
        <p>
          <strong>Scenario time:</strong>{' '}
          <time dateTime={result.scenario_timestamp}>{result.scenario_timestamp}</time>
        </p>
      )}
      {result.warnings.length > 0 && (
        <ul className="route-summary__warnings">
          {result.warnings.map((warning, index) => (
            <li key={`${warning}-${index}`}>{warning}</li>
          ))}
        </ul>
      )}
    </section>
  )
}
