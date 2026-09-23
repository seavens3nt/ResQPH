/**
 * SyncStatusBadge — Shows the offline synchronization state for a cached resource.
 *
 * UI states covered (UI_STATES.md):
 *   - Cached / stale: display `last_synced_at` and a clear cached/stale label
 *   - Pending Sync:   show the one queued event and prevent silent replacement
 *   - Sync failed:    preserve attempted event for review and show failure reason
 */

import './SyncStatusBadge.css'

export type SyncState = 'fresh' | 'stale' | 'pending' | 'failed'

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
  failed: 'Sync Failed',
}

const CSS_CLASSES: Record<SyncState, string> = {
  fresh: 'sync-badge--fresh',
  stale: 'sync-badge--stale',
  pending: 'sync-badge--pending',
  failed: 'sync-badge--failed',
}

function formatSyncTime(iso?: string): string {
  if (!iso) return 'Unknown'
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function SyncStatusBadge({ state, lastSyncedAt, failureReason, className = '' }: SyncStatusBadgeProps) {
  return (
    <div
      className={`sync-badge ${CSS_CLASSES[state]} ${className}`}
      role="status"
      aria-live="polite"
      aria-label={`Synchronization status: ${LABELS[state]}`}
    >
      <div className="sync-badge__header-row">
        <span className="sync-badge__dot" aria-hidden="true" />
        <span className="sync-badge__label">{LABELS[state]}</span>
      </div>

      {lastSyncedAt && (
        <span className="sync-badge__time">
          Last synced: {formatSyncTime(lastSyncedAt)}
        </span>
      )}

      {state === 'failed' && failureReason && (
        <span className="sync-badge__reason" role="alert">
          {failureReason}
        </span>
      )}

      {state === 'pending' && (
        <span className="sync-badge__pending-note">
          One transition queued — will sync on reconnect
        </span>
      )}
    </div>
  )
}
