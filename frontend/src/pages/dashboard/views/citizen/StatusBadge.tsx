/**
 * StatusBadge — displays a rescue-request status with both a text label and a
 * shape/icon so the state is never communicated by color alone.
 *
 * Accessibility: uses role="status" on the outermost element so screen readers
 * announce status changes when the badge is live-updated.
 */

import type { RequestStatus } from '../../../../features/requests/types'

interface StatusBadgeProps {
  status: RequestStatus
  /** Show a larger pill suitable for headings (default false = compact inline badge) */
  large?: boolean
}

const STATUS_CONFIG: Record<
  RequestStatus,
  { label: string; shape: string; bg: string; border: string; color: string }
> = {
  pending: {
    label: 'Pending dispatch',
    shape: '◷', // clock shape — not color-only
    bg: '#fef9c3',
    border: '#fde047',
    color: '#713f12',
  },
  assigned: {
    label: 'Team assigned',
    shape: '●',
    bg: '#dbeafe',
    border: '#93c5fd',
    color: '#1e3a5f',
  },
  'en-route': {
    label: 'En route',
    shape: '▶',
    bg: '#ede9fe',
    border: '#c4b5fd',
    color: '#3b0764',
  },
  arrived: {
    label: 'Arrived at location',
    shape: '★',
    bg: '#d1fae5',
    border: '#6ee7b7',
    color: '#064e3b',
  },
  completed: {
    label: 'Completed',
    shape: '✓',
    bg: '#f0fdf4',
    border: '#86efac',
    color: '#14532d',
  },
  cancelled: {
    label: 'Cancelled',
    shape: '✕',
    bg: '#f1f5f9',
    border: '#cbd5e1',
    color: '#475569',
  },
}

export function StatusBadge({ status, large = false }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status]

  return (
    <span
      role="status"
      aria-label={`Request status: ${cfg.label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: large ? '6px' : '4px',
        padding: large ? '5px 12px' : '2px 8px',
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: '9999px',
        color: cfg.color,
        fontWeight: 700,
        fontSize: large ? '0.88rem' : '0.75rem',
        whiteSpace: 'nowrap',
      }}
    >
      <span aria-hidden="true">{cfg.shape}</span>
      <span>{cfg.label}</span>
    </span>
  )
}
