/**
 * RescuerMissionCard — Displays a single mission's summary with stale/cached state.
 *
 * UI states covered (UI_STATES.md § Rescuer):
 *   - Cached / stale mission state (last_synced_at label)
 *   - Mission and route loading/failure states (handled by parent)
 *   - Valid status-transition action button
 */
import { SyncStatusBadge } from '../../../../components/ui/SyncStatusBadge'
import type { MissionDetail, MissionStatusHistoryItem } from '../../../../api/missions'
import { nextValidStatus } from '../../../../api/missions'
import { StatusBadge } from '../shared'
import { Button } from '../../../../components/ui/Button'
import { Icon } from '../../../../components/art/Icon'

interface RescuerMissionCardProps {
  mission: MissionDetail
  lastSyncedAt: string | null
  isStale: boolean
  isAdvancing: boolean
  onAdvanceStatus: () => void
}

export function RescuerMissionCard({
  mission,
  lastSyncedAt,
  isStale,
  isAdvancing,
  onAdvanceStatus,
}: RescuerMissionCardProps) {
  const next = nextValidStatus(mission.status)
  const req = mission.request_summary

  const NEXT_LABEL: Partial<Record<string, string>> = {
    'en-route': 'TAP EN ROUTE',
    arrived: 'TAP ARRIVED AT SCENE',
    completed: 'TAP RESCUE COMPLETED',
  }

  return (
    <div className="rescuer-mission-card" aria-label={`Mission ${mission.id}`}>
      {/* Header */}
      <div className="rescuer-mission-card__head">
        <div>
          <span className="rescuer-mission-card__id">{mission.id}</span>
          <StatusBadge status={mission.status} />
        </div>
        <SyncStatusBadge
          state={isStale ? 'stale' : 'fresh'}
          lastSyncedAt={lastSyncedAt ?? undefined}
        />
      </div>

      {/* Request summary */}
      <div className="rescuer-mission-card__meta">
        <span>
          <Icon name="pin" size={12} /> {req.location.address}
        </span>
        <span>👤 {req.headcount} persons</span>
        {req.medical_needs && (
          <span style={{ color: 'var(--color-danger-text)', fontWeight: 600 }}>
            🩺 Medical needed
          </span>
        )}
        <span>Flood level: {req.reported_flood_level}</span>
      </div>

      {/* Non-production prototype notice */}
      <p className="proto-notice" role="note" style={{ marginTop: 8 }}>
        <strong>Prototype:</strong> Route data is fixture-based; status transitions use demo role
        simulation. Not a production dispatch system.
      </p>

      {/* Next valid transition action */}
      {next && mission.status !== 'completed' ? (
        <Button
          variant="primary"
          size="lg"
          onClick={onAdvanceStatus}
          disabled={isAdvancing}
          aria-busy={isAdvancing}
          style={{ marginTop: 12 }}
        >
          <Icon name="route" size={18} />
          <span>{isAdvancing ? 'Updating…' : (NEXT_LABEL[next] ?? `Mark ${next}`)}</span>
        </Button>
      ) : mission.status === 'completed' ? (
        <span className="mission-completed-tag" role="status">
          ✓ Mission Completed
        </span>
      ) : null}

      {/* Status history */}
      {mission.status_history.length > 0 && (
        <details className="rescuer-mission-card__history">
          <summary>Status history ({mission.status_history.length} events)</summary>
          <ol aria-label="Mission status history">
            {mission.status_history.map((evt: MissionStatusHistoryItem) => (
              <li key={evt.event_id} className="history-item">
                <span className="history-item__states">
                  {evt.prior_status} → {evt.new_status}
                </span>
                <span className="history-item__meta">
                  {evt.actor_role} · {evt.source} ·{' '}
                  {new Date(evt.server_recorded_at).toLocaleTimeString()}
                </span>
                {evt.note && <span className="history-item__note">{evt.note}</span>}
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  )
}
