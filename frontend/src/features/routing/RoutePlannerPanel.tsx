import type { RouteRequest, RouteState } from './types'
import { RouteSummary } from './presentation'
import { CONTROLLED_NO_ROUTE_REQUEST, CONTROLLED_ROUTE_REQUEST } from './routeScenarios'
import './RoutePlannerPanel.css'

export interface RoutePlannerPanelProps {
  state: RouteState
  onRequest: (request: RouteRequest) => void
  onRetry: () => void
}

export function RoutePlannerPanel({ state, onRequest, onRetry }: RoutePlannerPanelProps) {
  const loading = state.status === 'loading'

  return (
    <section className="route-planner" aria-labelledby="route-planner-heading">
      <div className="route-planner__heading">
        <div>
          <p className="route-planner__eyebrow">Controlled academic scenario</p>
          <h3 id="route-planner-heading">Deterministic U-Belt route evaluation</h3>
        </div>
        <span className="route-planner__badge">Runtime ML disabled</span>
      </div>

      <p className="route-planner__scope">
        Uses the committed U-Belt fixture and A* with deterministic flood penalties. Results are
        not live navigation, official dispatch guidance, or a guarantee of road safety.
      </p>

      <dl className="route-planner__facts">
        <div>
          <dt>Scenario</dt>
          <dd>scenario-controlled-ubelt-001</dd>
        </div>
        <div>
          <dt>Algorithm</dt>
          <dd>A* (deterministic)</dd>
        </div>
        <div>
          <dt>Risk mode</dt>
          <dd>Rule-based fallback</dd>
        </div>
      </dl>

      <div className="route-planner__actions" aria-label="Controlled route cases">
        <button
          type="button"
          className="route-planner__button route-planner__button--primary"
          disabled={loading}
          onClick={() => onRequest(CONTROLLED_ROUTE_REQUEST)}
        >
          {loading ? 'Evaluating route…' : 'Calculate eligible route'}
        </button>
        <button
          type="button"
          className="route-planner__button"
          disabled={loading}
          onClick={() => onRequest(CONTROLLED_NO_ROUTE_REQUEST)}
        >
          Test explicit no-route case
        </button>
      </div>

      <RouteStateSummary state={state} onRetry={onRetry} />
    </section>
  )
}

function RouteStateSummary({ state, onRetry }: { state: RouteState; onRetry: () => void }) {
  if (state.status === 'route-found') {
    return <RouteSummary status="route-found" result={state.result} />
  }
  if (state.status === 'no-route') {
    return <RouteSummary status="no-route" result={state.result} />
  }
  if (state.status === 'error') {
    return (
      <RouteSummary
        status={state.retryable ? 'unavailable' : 'error'}
        message={state.message}
        retryable={state.retryable}
        onRetry={state.retryable ? onRetry : undefined}
      />
    )
  }
  return <RouteSummary status={state.status} />
}
