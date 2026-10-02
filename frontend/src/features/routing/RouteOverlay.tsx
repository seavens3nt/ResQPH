import { Icon } from '../../components/art/Icon'
import type { RouteState } from './types'

export function RouteOverlay({ state }: { state: RouteState }) {
  if (state.status === 'idle') {
    return (
      <div className="route-state-banner is-idle" role="status">
        <Icon name="route" size={16} />
        <span>No route has been calculated. Submit a controlled-scenario route request to display one.</span>
      </div>
    )
  }

  if (state.status === 'loading') {
    return (
      <div className="route-state-banner is-loading" role="status" aria-live="polite">
        <Icon name="clock" size={16} />
        <span>Calculating an eligible route from the controlled scenario…</span>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="route-state-banner is-error" role="alert">
        <Icon name="alert" size={16} />
        <span>
          <strong>Route unavailable:</strong> {state.message}
          {state.retryable ? ' You may retry when the service is available.' : ''}
        </span>
      </div>
    )
  }

  if (state.status === 'no-route') {
    return (
      <section className="route-state-panel is-no-route" role="status" aria-live="polite">
        <div className="route-state-heading">
          <Icon name="alert" size={17} />
          <strong>No eligible route under this controlled scenario</strong>
        </div>
        <p>No substitute or straight-line route is being shown.</p>
        <p className="route-state-meta">Reason: {state.result.reason}</p>
        <p className="route-state-meta">Scenario time: {state.result.scenario_timestamp}</p>
        <ul>
          {state.result.warnings.map((warning) => <li key={warning}>{warning}</li>)}
        </ul>
      </section>
    )
  }

  const { result } = state
  return (
    <section className="route-state-panel is-route-found" aria-label="Calculated controlled-scenario route">
      <div className="route-state-heading">
        <Icon name="route" size={17} />
        <strong>Controlled-scenario route displayed</strong>
      </div>
      <p className="route-state-meta">
        Route {result.route_id} · {result.edge_ids.length} edges · approximately {Math.ceil(result.estimated_time_s / 60)} minutes
      </p>
      <p className="route-state-meta">Scenario time: {result.scenario_timestamp}</p>
      {result.fallback_used && (
        <p className="route-fallback-notice" role="status">
          Rule-based fallback is active; runtime ML was not applied.
        </p>
      )}
      {result.warnings.length > 0 && (
        <ul className="route-warning-list">
          {result.warnings.map((warning) => <li key={warning}>{warning}</li>)}
        </ul>
      )}
    </section>
  )
}
