/**
 * RescuerMissionCard — Displays a single mission's summary with stale/cached state.
 *
 * UI states covered (UI_STATES.md § Rescuer):
 *   - Cached / stale mission state (last_synced_at label)
 *   - Mission and route loading/failure states (handled by parent)
 *   - Valid status-transition action button
 */
import { useId } from 'react'
import { SyncStatusBadge } from '../../../../components/ui/SyncStatusBadge'
import type { MissionDetail, MissionStatusHistoryItem } from '../../../../api/missions'
import { nextValidStatus } from '../../../../api/missions'
import { StatusBadge } from '../shared'
import { Button } from '../../../../components/ui/Button'
import { Icon } from '../../../../components/art/Icon'
import './RescuerMissionCard.css'

interface RescuerMissionCardProps {
  mission: MissionDetail
  lastSyncedAt: string | null
  isStale: boolean
  isAdvancing: boolean
  onAdvanceStatus: () => void
  isCached?: boolean
  isQueueLocked?: boolean
}

export function RescuerMissionCard({
  mission,
  lastSyncedAt,
  isStale,
  isAdvancing,
  onAdvanceStatus,
  isCached = false,
  isQueueLocked = false,
}: RescuerMissionCardProps) {
  const titleId = useId()
  const queueNoteId = useId()
  const next = nextValidStatus(mission.status)
  const req = mission.request_summary

  const NEXT_LABEL: Partial<Record<string, string>> = {
    'en-route': 'TAP EN ROUTE',
    arrived: 'TAP ARRIVED AT SCENE',
    completed: 'TAP RESCUE COMPLETED',
  }

  const syncState = isStale ? 'stale' : 'fresh'

  return (
    <article className="rescuer-mission-card" aria-labelledby={titleId}>
      {/* Header */}
      <div className="rescuer-mission-card__head">
        <div>
          <h3 className="rescuer-mission-card__id" id={titleId}>
            <span>Mission</span> <code>{mission.id}</code>
          </h3>
          <StatusBadge status={mission.status} />
        </div>
        <SyncStatusBadge
          state={syncState}
          lastSyncedAt={lastSyncedAt ?? undefined}
        />
      </div>

      {isCached && (
        <p className="rescuer-mission-card__cache-note" role="note">
          Cached mission for offline reference. Conditions may have changed since the last sync.
        </p>
      )}

      {/* Request summary */}
      {req ? (
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
      ) : (
        <p className="proto-notice" role="status">
          Request summary is unavailable. Refresh before beginning the mission.
        </p>
      )}

      {/* Non-production prototype notice */}
      <p className="proto-notice" role="note" style={{ marginTop: 8 }}>
        <strong>Prototype:</strong> Route data is fixture-based; status transitions use demo role
        simulation. Not a production dispatch system.
      </p>

      {/* Next valid transition action */}
      {next && mission.status !== 'completed' ? (
        <>
          {isQueueLocked && (
            <p id={queueNoteId} className="rescuer-mission-card__queue-note" role="status">
              A status transition is awaiting sync or review. The displayed mission status has not
              been advanced by that queued event.
            </p>
          )}
          {isAdvancing && (
            <p className="rescuer-mission-card__queue-note" role="status">
              Saving or syncing a status transition. Server acceptance is not yet confirmed.
            </p>
          )}
          <Button
            variant="primary"
            size="lg"
            onClick={onAdvanceStatus}
            disabled={isAdvancing || isQueueLocked}
            aria-busy={isAdvancing}
            aria-describedby={isQueueLocked ? queueNoteId : undefined}
          >
            <Icon name="route" size={18} />
            <span>
              {isAdvancing
                ? 'Saving status…'
                : isQueueLocked
                  ? 'Status update awaiting review'
                  : (NEXT_LABEL[next] ?? `Mark ${next}`)}
            </span>
          </Button>
        </>
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
    </article>
  )
}
