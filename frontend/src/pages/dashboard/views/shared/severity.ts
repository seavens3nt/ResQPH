import type { SeverityLevel } from '../../../../features/missions/types'

export const SEVERITY_CONFIG: Record<
  SeverityLevel,
  { label: string; depth: string; className: string; description: string }
> = {
  low: {
    label: 'Low',
    depth: 'Ankle-deep (0.1–0.2m)',
    className: 'severity-low',
    description: 'Minor gutter flood; passable by all vehicles.',
  },
  'low-moderate': {
    label: 'Low-Moderate',
    depth: 'Knee-deep (0.2–0.4m)',
    className: 'severity-low',
    description: 'Road passable only with high clearance vehicles.',
  },
  moderate: {
    label: 'Moderate',
    depth: 'Waist-deep (0.5–0.9m)',
    className: 'severity-moderate',
    description: 'Vehicle engine stall risk. Small boats or wading required.',
  },
  high: {
    label: 'High',
    depth: 'Chest-deep (1.0–1.4m)',
    className: 'severity-high',
    description: 'Impassable to standard vehicles. Rubber rescue craft required.',
  },
  severe: {
    label: 'Severe',
    depth: 'Overhead / Fast Current (>1.5m)',
    className: 'severity-severe',
    description: 'Life-threatening flood. Structural risk & swift water rescue unit required.',
  },
}
