import { useId } from 'react'
import type { NoRouteResult, RouteFoundResult, RouteResult } from '../types'
import { NoRouteState } from './NoRouteState'
import { RouteCostBreakdown } from './RouteCostBreakdown'
import { RouteExplanation } from './RouteExplanation'
import { RouteWarnings } from './RouteWarnings'
import './RouteSummary.css'

export type RouteSummaryProps =
  | { status: 'idle' }
  | { status: 'empty' }
  | { status: 'loading' }
  | { status: 'route-found'; result: RouteFoundResult }
  | { status: 'no-route'; result: NoRouteResult }
  | { status: 'stale'; lastSyncedAt: string; result?: RouteResult }
  | {
      status: 'unavailable' | 'error'
      message: string
      retryable?: boolean
      onRetry?: () => void
    }

function formatNumber(value: number) {
  return new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(value)
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes === 0) return `${formatNumber(seconds)} sec`
  if (remainingSeconds === 0) return `${formatNumber(minutes)} min`
  return `${formatNumber(minutes)} min ${formatNumber(remainingSeconds)} sec`
}

function RouteFacts({ result }: { result: RouteFoundResult }) {
  return (
    <>
      <dl className="route-summary__facts">
        <div>
          <dt>Distance</dt>
          <dd>{formatNumber(result.distance_m)} m</dd>
        </div>
        <div>
          <dt>Estimated time</dt>
          <dd>{formatDuration(result.estimated_time_s)}</dd>
        </div>
        <div>
          <dt>Total cost</dt>
          <dd>{formatNumber(result.total_cost)} cost units</dd>
        </div>
      </dl>
      {result.scenario_timestamp && (
        <p className="route-summary__scenario-time">
          Scenario time:{' '}
          <time dateTime={result.scenario_timestamp}>{result.scenario_timestamp}</time>
        </p>
      )}
      <RouteCostBreakdown breakdown={result.cost_breakdown} />
      <RouteExplanation explanation={result.explanation} />
      <RouteWarnings
        warnings={result.warnings}
        fallbackUsed={result.fallback_used}
        mlContribution={result.cost_breakdown.ml_risk}
      />
      <p className="route-summary__limitation">
        Academic prototype. Estimated time and route costs do not guarantee travel time or
        physical safety.
      </p>
    </>
  )
}

function FoundRoute({ result, stale }: { result: RouteFoundResult; stale: boolean }) {
  const headingId = useId()

  return (
    <section
      className="route-summary__result"
      aria-labelledby={headingId}
      aria-live={stale ? undefined : 'polite'}
    >
      <h2 id={headingId}>{stale ? 'Previously recorded route result' : 'Route result'}</h2>
      <RouteFacts result={result} />
    </section>
  )
}

function NoRouteResultPanel({
  result,
  stale = false,
}: {
  result: NoRouteResult
  stale?: boolean
}) {
  return <NoRouteState result={result} stale={stale} />
}

export function RouteSummary(props: RouteSummaryProps) {
  if (props.status === 'idle' || props.status === 'empty') {
    return (
      <section className="route-summary route-summary--empty" role="status">
        <h2>No route requested</h2>
        <p>Submit a route request for a controlled scenario to see its result.</p>
      </section>
    )
  }

  if (props.status === 'loading') {
    return (
      <section
        className="route-summary route-summary--loading"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <h2>Loading route result</h2>
        <p>Waiting for the controlled-scenario route result.</p>
      </section>
    )
  }

  if (props.status === 'route-found') {
    return (
      <div className="route-summary">
        <FoundRoute result={props.result} stale={false} />
      </div>
    )
  }

  if (props.status === 'no-route') {
    return (
      <div className="route-summary">
        <NoRouteResultPanel result={props.result} />
      </div>
    )
  }

  if (props.status === 'stale') {
    return (
      <div className="route-summary">
        <section className="route-summary__notice route-summary__notice--stale" role="status">
          <h2>Cached / stale route result</h2>
          <p>
            {props.result
              ? 'Showing a previously recorded result. '
              : 'No current route result is available. '}
            Last synced at <time dateTime={props.lastSyncedAt}>{props.lastSyncedAt}</time>.
          </p>
        </section>
        {props.result?.status === 'route-found' && (
          <FoundRoute result={props.result} stale />
        )}
        {props.result?.status === 'no-route' && (
          <NoRouteResultPanel result={props.result} stale />
        )}
      </div>
    )
  }

  return (
    <section
      className="route-summary route-summary--unavailable"
      role="alert"
      aria-live="assertive"
    >
      <h2>Route unavailable</h2>
      <p>{props.message}</p>
      {props.retryable && props.onRetry && (
        <button type="button" className="route-summary__retry" onClick={props.onRetry}>
          Retry route request
        </button>
      )}
    </section>
  )
}
