/**
 * SyncStatusBadge — Shows the offline synchronization state for a cached resource.
 *
 * UI states covered (UI_STATES.md):
 *   - Cached / stale: display `last_synced_at` and a clear cached/stale label
 *   - Pending Sync:   show the one queued event and prevent silent replacement
 *   - Sync failed:    preserve attempted event for review and show failure reason
 */

import './SyncStatusBadge.css'

export type SyncState = 'fresh' | 'stale' | 'pending' | 'syncing' | 'failed' | 'success'

interface SyncStatusBadgeProps {
  state: SyncState
  lastSyncedAt?: string // ISO 8601 UTC timestamp
  failureReason?: string
  className?: string
}

const LABELS: Record<SyncState, string> = {
  fresh: 'Synced',
  stale: 'Cached · Possibly Stale',
  pending: 'Pending Sync',
  syncing: 'Syncing',
  failed: 'Sync Failed',
  success: 'Acknowledged',
}

const CSS_CLASSES: Record<SyncState, string> = {
  fresh: 'sync-badge--fresh',
  stale: 'sync-badge--stale',
  pending: 'sync-badge--pending',
  syncing: 'sync-badge--syncing',
  failed: 'sync-badge--failed',
  success: 'sync-badge--success',
}

function isValidTimestamp(iso: string | undefined): iso is string {
  return iso !== undefined && !Number.isNaN(Date.parse(iso))
}

function formatSyncTime(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'long',
  }).format(new Date(iso))
}

export function SyncStatusBadge({
  state,
  lastSyncedAt,
  failureReason,
  className = '',
}: SyncStatusBadgeProps) {
  const hasValidTimestamp = isValidTimestamp(lastSyncedAt)

  return (
    <div
      className={`sync-badge ${CSS_CLASSES[state]} ${className}`}
      role="status"
      aria-live="polite"
      aria-label={`Synchronization status: ${LABELS[state]}`}
    >
      <div className="sync-badge__header-row">
        <span className="sync-badge__label">{LABELS[state]}</span>
      </div>

      {state === 'stale' && (
        <>
          {hasValidTimestamp ? (
            <time className="sync-badge__time" dateTime={lastSyncedAt}>
              Last synced: {formatSyncTime(lastSyncedAt)}
            </time>
          ) : (
            <span className="sync-badge__time">Last sync time is unavailable.</span>
          )}
          <span className="sync-badge__note">
            Conditions may have changed since this mission was last synchronized.
          </span>
        </>
      )}

      {state === 'fresh' && hasValidTimestamp && (
        <time className="sync-badge__time" dateTime={lastSyncedAt}>
          Last synced: {formatSyncTime(lastSyncedAt)}
        </time>
      )}

      {state === 'pending' && (
        <span className="sync-badge__note">
          One transition queued — will sync on reconnect. It has not been accepted by the server.
        </span>
      )}

      {state === 'syncing' && (
        <span className="sync-badge__note">
          Sending the queued transition. Server acceptance is not yet confirmed.
        </span>
      )}

      {state === 'failed' && (
        <>
          <span className="sync-badge__note">The queued transition was not accepted.</span>
          {failureReason && (
            <span className="sync-badge__reason">
              Failure reason: {failureReason}
            </span>
          )}
          {!failureReason && (
            <span className="sync-badge__reason">Failure reason was not provided.</span>
          )}
        </>
      )}

      {state === 'success' && (
        <span className="sync-badge__note">The server acknowledged this transition.</span>
      )}
    </div>
  )
}
