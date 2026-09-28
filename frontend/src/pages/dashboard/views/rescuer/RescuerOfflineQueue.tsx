/**
 * RescuerOfflineQueue — Shows the single queued offline status event and its sync result.
 *
 * UI states covered (UI_STATES.md § Rescuer):
 *   - Pending Sync: one queued event visible, locked from replacement
 *   - Sync failed: event preserved + failure reason + current server state shown
 *   - Offline: network-dependent actions blocked except this one queued transition
 */
import { SyncStatusBadge } from '../../../../components/ui/SyncStatusBadge'
import type { OfflineQueueEntry } from '../../../../api/missions'
import { Button } from '../../../../components/ui/Button'
import './RescuerOfflineQueue.css'

interface RescuerOfflineQueueProps {
  entry: OfflineQueueEntry | null
  isOffline: boolean
  onRetrySync: () => void
  onDismissFailed: () => void
}

export function RescuerOfflineQueue({
  entry,
  isOffline,
  onRetrySync,
  onDismissFailed,
}: RescuerOfflineQueueProps) {
  if (!entry && !isOffline) return null

  return (
    <div
      className="offline-queue-panel"
      role="region"
      aria-label="Offline synchronization queue"
    >
      <div className="offline-queue-panel__header">
        <span className="offline-queue-panel__title">
          {isOffline ? '📡 Offline Mode Active' : '🔄 Sync Queue'}
        </span>
        {entry && (
          <SyncStatusBadge
            state={entry.syncState === 'pending' ? 'pending' : entry.syncState === 'failed' ? 'failed' : 'stale'}
            lastSyncedAt={entry.enqueuedAt}
            failureReason={entry.failureReason}
          />
        )}
      </div>

      {isOffline && !entry && (
        <p className="offline-queue-panel__body">
          Network-dependent actions are unavailable. You may queue one status transition — it will
          sync automatically when you reconnect.
        </p>
      )}

      {entry && (
        <div className="offline-queue-panel__entry">
          <div className="offline-queue-entry">
            <span className="offline-queue-entry__label">Queued Transition</span>
            <span className="offline-queue-entry__value">
              Mission <strong>{entry.missionId}</strong> →{' '}
              <strong>{entry.body.new_status}</strong>
            </span>
            <span className="offline-queue-entry__time">
              Queued: {new Date(entry.enqueuedAt).toLocaleTimeString()}
            </span>
          </div>

          {entry.syncState === 'failed' && (
            <>
              <div
                className="offline-queue-panel__failure"
                role="alert"
                aria-live="assertive"
              >
                <strong>Sync Failed:</strong> {entry.failureReason ?? 'Unknown error'}
                <br />
                <small>
                  The server rejected this transition. Current server state is shown above.
                  The queued event is preserved below for your review.
                </small>
              </div>
              <div className="offline-queue-panel__actions">
                <Button variant="ghost" size="sm" onClick={onDismissFailed}>
                  Dismiss Failed Event
                </Button>
              </div>
            </>
          )}

          {entry.syncState === 'pending' && !isOffline && (
            <div className="offline-queue-panel__actions">
              <Button variant="outline" size="sm" onClick={onRetrySync}>
                Retry Sync Now
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
