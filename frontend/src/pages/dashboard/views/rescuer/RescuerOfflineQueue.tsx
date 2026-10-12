/**
 * RescuerOfflineQueue — Shows the single queued offline status event and its sync result.
 *
 * UI states covered (UI_STATES.md § Rescuer):
 *   - Pending Sync: one queued event visible, locked from replacement
 *   - Sync failed: event preserved + failure reason + current server state shown
 *   - Offline: network-dependent actions blocked except this one queued transition
 */
import { useId, useState } from 'react'
import { Modal } from '../../../../components/ui/Modal'
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
  onRefresh?: () => void
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
  onRefresh,
}: RescuerOfflineQueueProps) {
  const titleId = useId()
  const retryHelpId = useId()
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  if (!entry && !isOffline && !storageError) return null

  const syncing = entry?.syncState === 'syncing'
  const verifiedServerMission = currentServerMission?.id === entry?.missionId
    ? currentServerMission
    : null

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
            {entry.body.note && (
              <div>
                <dt>Attempted event note</dt>
                <dd>{entry.body.note}</dd>
              </div>
            )}
          </dl>

          {entry.syncState === 'pending' && (
            <p className="offline-queue-panel__pending-note" role="status">
              Acceptance is not yet verified. This local attempt remains pending until server history or a response confirms it.
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
                {verifiedServerMission && !verifiedServerMission.status_history.some(item => item.event_id === entry.localId)
                  ? 'Rejected attempt: the latest retrieved server history does not contain this event.'
                  : 'Acceptance cannot yet be verified. This may be a preserved earlier failure; refresh server state before deciding.'}
              </p>
              <p>
                <strong>Failure reason:</strong>{' '}
                {entry.failureReason || 'No failure details were provided.'}
              </p>
              {entry.failureReason?.includes('Simulated role') && <p>The earlier response rejected the signed-in role. Sign in as the assigned station and use separate browser profiles for citizen and rescuer testing.</p>}
              {verifiedServerMission ? (
                <p className="offline-queue-panel__server-state">
                  <strong>Current server state:</strong> {verifiedServerMission.status}, version{' '}
                  {verifiedServerMission.version}.
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
              <div className="offline-queue-panel__actions">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
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
              {onRefresh && <Button type="button" variant="outline" size="sm" disabled={isOffline || syncing} onClick={onRefresh}>Refresh server state</Button>}
              {(entry.failureCode === 'forbidden' || entry.failureReason?.includes('Simulated role')) && <a href="/login">Sign in as the assigned station</a>}
              {['authentication_required','session_identity_changed','csrf_validation_failed'].includes(entry.failureCode ?? '') && <>
                <a href="/login">Sign in again as this station</a>
                <Button type="button" variant="outline" size="sm" disabled={isOffline} onClick={onRetrySync}>Retry after signing in</Button>
              </>}
              <Button
                variant="danger"
                size="sm"
                type="button"
                onClick={() => setConfirmDiscard(true)}
                disabled={syncing}
                aria-label={`Dismiss Failed Event — Discard Failed Event After Review, event ${entry.body.event_id}`}
              >
                Discard Failed Event After Review
              </Button>
            </div>
          )}
          <Modal isOpen={confirmDiscard} onClose={() => setConfirmDiscard(false)} title="Discard local queued attempt?">
            <p>This removes only this local queued attempt. It does not delete or cancel the server mission. A private recovery record is retained for this account.</p>
            <p>{isOffline ? 'You are offline: acceptance cannot be checked. The server may already have accepted this exact event.' : 'Server history will be checked first. If this exact event was accepted, it will be reconciled instead of discarded.'}</p>
            <Button type="button" variant="outline" onClick={() => setConfirmDiscard(false)}>Keep attempt</Button>
            <Button type="button" variant="danger" onClick={() => {setConfirmDiscard(false);onDismissFailed()}}>Confirm discard local attempt</Button>
          </Modal>
        </div>
      )}
    </section>
  )
}
