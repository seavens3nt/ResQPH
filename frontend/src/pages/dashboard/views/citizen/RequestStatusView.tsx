/**
 * RequestStatusView — authoritative rescue-request status tracker.
 *
 * Fetches status from GET /rescue-requests/{id} via useRescueRequest and
 * auto-polls while the request is in a non-terminal state (every 10 s).
 * Implements all required observable states from UI_STATES.md:
 *   loading · cached/stale · conflict (409) · system-error · success
 *   (pending / assigned / en-route / arrived / completed / cancelled)
 *
 * Always shows:
 *  - The authoritative request ID and status (replaces any stale local state).
 *  - A "Controlled/historical information only" label per the wireframe.
 *  - Last-updated timestamp so the user knows whether data is fresh.
 *  - Refresh button for manual re-fetch.
 *  - Cancel action when the request is still pending.
 *
 * No ETA or route-safety guarantee is presented.
 */

import { useRescueRequest, useCancelRescueRequest, rescueRequestKeys } from '../../../../features/requests/hooks'
import { PrototypeNotice } from './PrototypeNotice'
import { StatusBadge } from './StatusBadge'
import type { RequestStatus } from '../../../../features/requests/types'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

const STAGE_ORDER: RequestStatus[] = ['pending', 'assigned', 'en-route', 'arrived', 'completed']

const STAGE_LABELS: Record<RequestStatus, string> = {
  pending: 'Pending dispatch',
  assigned: 'Team assigned',
  'en-route': 'En route',
  arrived: 'Arrived at location',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

interface RequestStatusViewProps {
  requestId: string
  /** Called when user confirms cancellation */
  onCancelled?: () => void
}

export function RequestStatusView({ requestId, onCancelled }: RequestStatusViewProps) {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error, dataUpdatedAt, isFetching } = useRescueRequest(requestId)
  const { mutate: cancel, isPending: isCancelling } = useCancelRescueRequest()
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div
        aria-live="polite"
        aria-busy="true"
        data-testid="status-loading"
        style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.88rem' }}
      >
        <span aria-hidden="true">⏳</span> Loading request status…
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Error
  // ---------------------------------------------------------------------------
  if (isError || !data) {
    const msg = error instanceof Error ? error.message : 'Unable to load request status.'
    return (
      <div
        role="alert"
        data-testid="status-error"
        style={{
          padding: '1rem',
          background: '#fef2f2',
          border: '1px solid #fca5a5',
          borderRadius: '8px',
          color: '#7f1d1d',
          fontSize: '0.85rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        <strong>⚠ Could not load request status</strong>
        <span>{msg}</span>
        <button
          type="button"
          onClick={() => queryClient.invalidateQueries({ queryKey: rescueRequestKeys.detail(requestId) })}
          style={{
            alignSelf: 'flex-start',
            padding: '4px 12px',
            borderRadius: '6px',
            border: '1px solid #fca5a5',
            background: '#fff',
            color: '#7f1d1d',
            fontWeight: 600,
            fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Success — data loaded
  // ---------------------------------------------------------------------------
  const { id, status, location, headcount, reported_flood_level, updated_at, status_history, version } = data

  const currentStageIdx = STAGE_ORDER.indexOf(status as RequestStatus)
  const isCancelled = status === 'cancelled'
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : 'unknown'
  const serverUpdated = updated_at ? new Date(updated_at).toLocaleString() : '—'

  function handleCancel() {
    setCancelError(null)
    cancel(
      { requestId: id, payload: { reason: 'Citizen cancelled via prototype UI', version } },
      {
        onSuccess: () => {
          setShowCancelConfirm(false)
          onCancelled?.()
        },
        onError: (err) => {
          const axiosErr = err as { response?: { status?: number; data?: { error?: { message?: string } } } }
          if (axiosErr.response?.status === 409) {
            setCancelError(
              'Conflict: the request state changed before cancellation. ' +
              'Refresh to see the current status.',
            )
          } else {
            setCancelError('Cancellation failed. Your input is preserved — try again.')
          }
        },
      },
    )
  }

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      data-testid="status-view"
    >
      <PrototypeNotice variant="status" />

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div
        className="modern-clean-card"
        style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
            Request {id}
          </h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Stale indicator */}
            {isFetching && (
              <span
                aria-label="Refreshing…"
                style={{ fontSize: '0.72rem', color: '#64748b' }}
              >
                ↻ Refreshing…
              </span>
            )}
            <button
              type="button"
              aria-label="Refresh request status"
              onClick={() => queryClient.invalidateQueries({ queryKey: rescueRequestKeys.detail(requestId) })}
              style={{
                padding: '3px 10px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                color: '#475569',
              }}
            >
              Refresh
            </button>
          </div>
        </div>

        <StatusBadge status={status as RequestStatus} large />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.78rem', color: '#64748b' }}>
          <span>Last updated (server): <strong style={{ color: '#0f172a' }}>{serverUpdated}</strong></span>
          <span>Last fetched: <strong style={{ color: '#0f172a' }}>{lastUpdated}</strong></span>
        </div>

        {/* Data source notice — required by wireframe */}
        <div
          style={{
            padding: '4px 8px',
            background: '#f1f5f9',
            borderRadius: '4px',
            fontSize: '0.72rem',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <span aria-hidden="true">ℹ</span>
          Controlled/historical information only — not live or official dispatch data
        </div>
      </div>

      {/* ── Stage stepper ────────────────────────────────────────────── */}
      {!isCancelled && (
        <div
          aria-label="Request progress"
          className="modern-clean-card"
          style={{
            padding: '1rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
            gap: '0.5rem',
          }}
        >
          {STAGE_ORDER.map((stage, idx) => {
            const isPast = idx <= currentStageIdx
            const isCurrent = status === stage
            return (
              <div
                key={stage}
                aria-current={isCurrent ? 'step' : undefined}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  opacity: isPast ? 1 : 0.4,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span
                    aria-hidden="true"
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      background: isCurrent ? '#dc2626' : isPast ? '#0f172a' : '#e2e8f0',
                      color: isPast ? '#fff' : '#94a3b8',
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: isCurrent ? 700 : 500,
                      color: isCurrent ? '#dc2626' : '#0f172a',
                    }}
                  >
                    {STAGE_LABELS[stage]}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Request summary ──────────────────────────────────────────── */}
      <div
        className="modern-clean-card"
        style={{ padding: '1rem 1.25rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.85rem' }}
      >
        <div>
          <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>Location</span>
          <strong style={{ color: '#0f172a' }}>{location.address}</strong>
        </div>
        <div>
          <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>People</span>
          <strong style={{ color: '#0f172a' }}>{headcount}</strong>
        </div>
        <div>
          <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>Reported flood level</span>
          <strong style={{ color: '#0f172a', textTransform: 'capitalize' }}>{reported_flood_level}</strong>
        </div>
      </div>

      {/* ── Status history ───────────────────────────────────────────── */}
      {status_history && status_history.length > 0 && (
        <div
          className="modern-clean-card"
          style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
        >
          <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Status history
          </h4>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {status_history.map((entry, idx) => (
              <li
                key={idx}
                style={{ display: 'flex', gap: '10px', fontSize: '0.8rem', alignItems: 'baseline' }}
              >
                <span style={{ color: '#94a3b8', fontFamily: 'monospace', flexShrink: 0 }}>
                  {new Date(entry.occurred_at).toLocaleString()}
                </span>
                <span style={{ color: '#475569' }}>—</span>
                <span style={{ color: '#0f172a', fontWeight: 600, textTransform: 'capitalize' }}>
                  {entry.status}
                </span>
                {entry.note && (
                  <span style={{ color: '#64748b' }}>{entry.note}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Cancel action ────────────────────────────────────────────── */}
      {status === 'pending' && !showCancelConfirm && (
        <button
          type="button"
          onClick={() => setShowCancelConfirm(true)}
          style={{
            alignSelf: 'flex-start',
            padding: '6px 14px',
            borderRadius: '7px',
            border: '1px solid #e2e8f0',
            background: '#fff',
            color: '#475569',
            fontWeight: 600,
            fontSize: '0.82rem',
            cursor: 'pointer',
          }}
        >
          Cancel request
        </button>
      )}

      {showCancelConfirm && (
        <div
          role="dialog"
          aria-label="Cancel request confirmation"
          style={{
            padding: '0.85rem 1rem',
            background: '#fff7ed',
            border: '1px solid #fed7aa',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
          }}
        >
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#7c2d12' }}>
            <strong>Cancel this request?</strong> If you are in immediate danger, keep the request active or call 911.
          </p>
          {cancelError && (
            <p role="alert" style={{ margin: 0, fontSize: '0.8rem', color: '#dc2626' }}>
              {cancelError}
            </p>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => { setShowCancelConfirm(false); setCancelError(null) }}
              disabled={isCancelling}
              style={{
                padding: '4px 12px', borderRadius: '6px', border: '1px solid #fed7aa',
                background: '#fff', color: '#7c2d12', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
              }}
            >
              Keep active
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isCancelling}
              aria-busy={isCancelling}
              style={{
                padding: '4px 12px', borderRadius: '6px', border: 'none',
                background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: '0.8rem',
                cursor: isCancelling ? 'not-allowed' : 'pointer',
              }}
            >
              {isCancelling ? 'Cancelling…' : 'Yes, cancel'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
