import type { RequestStatus } from '../../../../features/missions/types'

const statusColor: Record<RequestStatus, string> = {
  pending: 'var(--color-warning)',
  assigned: 'var(--color-info)',
  'en-route': 'var(--color-brand)',
  arrived: '#10b981',
  completed: 'var(--color-success)',
  cancelled: 'var(--text-disabled)',
}

const statusLabel: Record<RequestStatus, string> = {
  pending: 'Pending dispatch',
  assigned: 'Team assigned',
  'en-route': 'En route',
  arrived: 'Arrived at scene',
  completed: 'Rescue completed',
  cancelled: 'Cancelled',
}

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span
      className="status-badge"
      style={{
        background: `rgb(from ${statusColor[status]} r g b / 15%)`,
        color: statusColor[status],
        border: `1px solid rgb(from ${statusColor[status]} r g b / 30%)`,
      }}
    >
      {statusLabel[status]}
    </span>
  )
}
