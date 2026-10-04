/**
 * RescuerOfflineQueue — Shows the single queued offline status event and its sync result.
 *
 * UI states covered (UI_STATES.md § Rescuer):
 *   - Pending Sync: one queued event visible, locked from replacement
 *   - Sync failed: event preserved + failure reason + current server state shown
 *   - Offline: network-dependent actions blocked except this one queued transition
 */
import { useId } from 'react'
import type { MissionDetail, OfflineQueueEntry } from '../../../../api/missions'
import { Button } from '../../../../components/ui/Button'
import { SyncStatusBadge } from '../../../../components/ui/SyncStatusBadge'
import './RescuerOfflineQueue.css'

export interface RescuerOfflineQueueProps {
  entry: OfflineQueueEntry | null
  isOffline: boolean
  onRetrySync: () => void
  onDismissFailed: () => void
  currentServerMission?: MissionDetail | null
  storageError?: string | null
}

function formatTimestamp(value: string) {
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) return value
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'long',
  }).format(timestamp)
}

function getBadgeState(entry: OfflineQueueEntry) {
  switch (entry.syncState) {
    case 'pending':
      return 'pending'
    case 'syncing':
      return 'syncing'
    case 'failed':
      return 'failed'
    case 'success':
      return 'success'
  }
}

export function RescuerOfflineQueue({
  entry,
  isOffline,
  onRetrySync,
  onDismissFailed,
  currentServerMission,
  storageError,
}: RescuerOfflineQueueProps) {
  const titleId = useId()
  const retryHelpId = useId()

  if (!entry && !isOffline && !storageError) return null

  const syncing = entry?.syncState === 'syncing'

  return (
    <section className="offline-queue-panel" aria-labelledby={titleId}>
      <div className="offline-queue-panel__header">
        <h2 id={titleId} className="offline-queue-panel__title">
          Offline synchronization
        </h2>
        {entry && <SyncStatusBadge state={getBadgeState(entry)} failureReason={entry.failureReason} />}
        {!entry && isOffline && (
          <span className="offline-queue-panel__label">Offline Mode Active</span>
        )}
      </div>

      {isOffline && (
        <p className="offline-queue-panel__body" role="status">
          Network-dependent actions are unavailable. You may queue one status transition from an
          available cached mission when storage is available. It is not accepted until the server
          acknowledges it.
        </p>
      )}

      {!entry && isOffline && (
        <p className="offline-queue-panel__body">
          No status transition is queued. If no mission is available offline, reconnect to
          retrieve the assigned mission before attempting a status change. This queue does not
          confirm that a mission or map is cached.
        </p>
      )}

      {storageError && (
        <div className="offline-queue-panel__storage-error" role="alert" aria-live="assertive">
          <strong>Offline storage problem:</strong> {storageError}
          <p>
            The interface cannot confirm that offline data was saved or retrieved successfully.
            Reconnect before relying on cached mission state.
          </p>
        </div>
      )}

      {entry && (
        <div className="offline-queue-panel__entry">
          <dl className="offline-queue-panel__details">
            <div>
              <dt>Mission</dt>
              <dd>{entry.missionId}</dd>
            </div>
            <div>
              <dt>Queued Transition</dt>
              <dd>{entry.body.new_status}</dd>
            </div>
            <div>
              <dt>Event ID</dt>
              <dd>{entry.body.event_id}</dd>
            </div>
            <div>
              <dt>Expected mission version</dt>
              <dd>{entry.body.expected_mission_version}</dd>
            </div>
            <div>
              <dt>Recorded on this device</dt>
              <dd>
                <time dateTime={entry.body.client_recorded_at}>
                  {formatTimestamp(entry.body.client_recorded_at)}
                </time>
              </dd>
            </div>
            <div>
              <dt>Queued on this device</dt>
              <dd>
                <time dateTime={entry.enqueuedAt}>{formatTimestamp(entry.enqueuedAt)}</time>
              </dd>
            </div>
            <div>
              <dt>Event source</dt>
              <dd>{entry.body.source}</dd>
            </div>
          </dl>

          {entry.syncState === 'pending' && (
            <p className="offline-queue-panel__pending-note" role="status">
              This status remains pending and has not been accepted by the server.
            </p>
          )}

          {syncing && (
            <p className="offline-queue-panel__pending-note" role="status">
              The queued status is being sent. Acceptance is not confirmed until a response is
              received.
            </p>
          )}

          {entry.syncState === 'success' && (
            <p className="offline-queue-panel__success" role="status">
              The server acknowledged this queued status.
            </p>
          )}

          {entry.syncState === 'failed' && (
            <div className="offline-queue-panel__failure" role="alert" aria-live="assertive">
              <h3>Sync Failed: event preserved for review</h3>
              <p>
                This attempted status has not been accepted. Review the event details above before
                discarding it.
              </p>
              <p>
                <strong>Failure reason:</strong>{' '}
                {entry.failureReason || 'No failure details were provided.'}
              </p>
              {currentServerMission ? (
                <p className="offline-queue-panel__server-state">
                  <strong>Current server state:</strong> {currentServerMission.status}, version{' '}
                  {currentServerMission.version}.
                </p>
              ) : (
                <p className="offline-queue-panel__server-state">
                  Current server state could not be retrieved or verified.
                </p>
              )}
            </div>
          )}

          {entry.syncState === 'pending' && (
            <>
              {isOffline && (
                <p id={retryHelpId} className="offline-queue-panel__action-help">
                  Reconnect before retrying this pending event.
                </p>
              )}
              {syncing && (
                <p id={retryHelpId} className="offline-queue-panel__action-help">
                  Wait for the current sync attempt to finish before retrying.
                </p>
              )}
              <div className="offline-queue-panel__actions">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetrySync}
                  disabled={isOffline || syncing}
                  aria-describedby={isOffline || syncing ? retryHelpId : undefined}
                >
                  Retry Sync Now
                </Button>
              </div>
            </>
          )}

          {entry.syncState === 'failed' && (
            <div className="offline-queue-panel__actions">
              <Button
                variant="danger"
                size="sm"
                onClick={onDismissFailed}
                disabled={syncing}
                aria-label={`Dismiss Failed Event — Discard Failed Event After Review, event ${entry.body.event_id}`}
              >
                Discard Failed Event After Review
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
