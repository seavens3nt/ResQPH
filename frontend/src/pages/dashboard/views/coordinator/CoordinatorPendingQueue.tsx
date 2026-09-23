/**
 * CoordinatorPendingQueue — Fetches and displays the pending rescue-request queue.
 *
 * UI states covered (UI_STATES.md § Coordinator):
 *   Loading, Empty, System Error, Conflict (on refresh after 409), Unauthorized role
 */
import { useQuery } from '@tanstack/react-query'
import { ApiError, listPendingRequests } from '../../../../api/assignments'
import type { ApiRescueRequestSummary, PaginatedRequests } from '../../../../api/assignments'
import { ApiErrorBanner } from '../../../../components/ui/ApiErrorBanner'
import { RoleNotice } from '../../../../components/ui/RoleNotice'
import { StatusBadge } from '../shared'
import { Icon } from '../../../../components/art/Icon'
import { Button } from '../../../../components/ui/Button'
import './CoordinatorPendingQueue.css'

interface CoordinatorPendingQueueProps {
  selectedId: string | null
  onSelect: (req: ApiRescueRequestSummary) => void
  onAssign: (req: ApiRescueRequestSummary) => void
}

export function CoordinatorPendingQueue({
  selectedId,
  onSelect,
  onAssign,
}: CoordinatorPendingQueueProps) {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<PaginatedRequests, ApiError>({
    queryKey: ['pending-requests'],
    queryFn: () => listPendingRequests(),
    staleTime: 15_000,
    retry: false,
  })

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="coord-queue" aria-busy="true" aria-label="Loading rescue request queue">
        <div className="coord-queue__loading">
          <span className="coord-queue__spinner" aria-hidden="true" />
          <span>Loading pending requests…</span>
        </div>
      </div>
    )
  }

  // ── Error (role / system / unavailable) ──────────────────────────────────
  if (isError && error instanceof ApiError) {
    if (error.isForbidden) {
      return (
        <div className="coord-queue">
          <RoleNotice
            attemptedAction="view the pending rescue request queue"
            currentRole="current role"
            requiredRole="coordinator"
          />
        </div>
      )
    }
    return (
      <div className="coord-queue">
        <ApiErrorBanner
          error={error}
          onRetry={() => void refetch()}
          onRefresh={() => void refetch()}
        />
      </div>
    )
  }

  const items = data?.items ?? []

  // ── Empty state ──────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="coord-queue">
        <div className="empty-state" aria-label="No pending rescue requests">
          <Icon name="shield" size={32} />
          <p style={{ fontWeight: 600, marginTop: 8 }}>No Pending Requests</p>
          <p>All rescue requests have been assigned or there are no active distress calls.</p>
          <Button variant="ghost" size="sm" onClick={() => void refetch()}>
            Refresh Queue
          </Button>
        </div>
      </div>
    )
  }

  // ── Populated list ───────────────────────────────────────────────────────
  return (
    <div className="coord-queue">
      <div className="coord-queue__header">
        <span className="coord-queue__count">
          {items.length} pending request{items.length !== 1 ? 's' : ''}
        </span>
        <button
          type="button"
          className="coord-queue__refresh-btn"
          onClick={() => void refetch()}
          aria-label="Refresh pending queue"
        >
          <Icon name="refresh" size={14} />
        </button>
      </div>

      <div className="item-list" role="list" aria-label="Pending rescue requests">
        {items.map((req: ApiRescueRequestSummary) => (
          <div
            key={req.id}
            role="listitem"
            className={`item-card coord-req-card ${selectedId === req.id ? 'is-selected' : ''}`}
            onClick={() => onSelect(req)}
            tabIndex={0}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') onSelect(req)
            }}
            aria-selected={selectedId === req.id}
            aria-label={`Request ${req.id} — ${req.location.address}`}
          >
            <span className="item-card__icon">
              <Icon name="alert" size={18} />
            </span>
            <div className="item-card__body">
              <div className="item-card__head">
                <span className="item-card__title">{req.id}</span>
                <span className={`severity-tag severity-${req.reported_flood_level}`}>
                  {req.reported_flood_level}
                </span>
                <StatusBadge status={req.status} />
              </div>
              <div className="item-card__meta">
                <span>
                  <Icon name="pin" size={12} /> {req.location.address}
                </span>
                <span>👤 {req.headcount} people</span>
                {req.medical_needs && (
                  <span style={{ color: 'var(--color-danger-text)', fontWeight: 600 }}>
                    🩺 Medical Needed
                  </span>
                )}
                <span>{new Date(req.submitted_at).toLocaleTimeString()}</span>
              </div>
            </div>

            {req.status === 'pending' && (
              <Button
                variant="primary"
                size="sm"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation()
                  onAssign(req)
                }}
              >
                Assign
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
