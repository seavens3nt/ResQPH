import { useState, type ReactNode } from 'react'
import { Icon, type IconName } from '../../../components/art/Icon'
import { Modal } from '../../../components/ui/Modal'
import type {
  RequestStatus,
  SeverityLevel,
  Vulnerabilities,
} from '../../../features/missions/types'
import './shared.css'

// Re-export the dedicated iOS-style weather widget from its standalone component
export { LocalizedForecastWidget } from './shared/LocalizedForecastWidget'

export interface StatCardData {
  label: string
  value: string | number
  icon: IconName
  accent?: boolean
  subtext?: string
}

export function StatCard({ label, value, icon, accent, subtext }: StatCardData) {
  return (
    <div className={`stat-card${accent ? ' stat-card--accent' : ''}`}>
      <span className="stat-card__icon">
        <Icon name={icon} size={18} />
      </span>
      <div>
        <span className="stat-card__val">{value}</span>
        <span className="stat-card__label">{label}</span>
        {subtext ? <span className="stat-card__subtext">{subtext}</span> : null}
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------- */
interface SectionProps {
  title: string
  subtitle?: string
  children: ReactNode
  action?: ReactNode
}

export function Section({ title, subtitle, children, action }: SectionProps) {
  return (
    <section className="dash-section">
      <div className="dash-section__head">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

/* ----------------------------------------------------------------- */
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

/* ----------------------------------------------------------------- */
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

export function SeverityTag({ severity }: { severity: SeverityLevel }) {
  const cfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.moderate
  return (
    <span className={`severity-tag ${cfg.className}`}>
      {cfg.label} · {cfg.depth}
    </span>
  )
}

/* ----------------------------------------------------------------- */
export function VulnerabilitiesBadges({ vulns }: { vulns: Vulnerabilities }) {
  const activeItems: { label: string; icon: string }[] = []
  if (vulns.infant) activeItems.push({ label: 'Infant / Child', icon: '🍼' })
  if (vulns.senior) activeItems.push({ label: 'Senior Citizen', icon: '👵' })
  if (vulns.pwd) activeItems.push({ label: 'PWD', icon: '♿' })
  if (vulns.pregnant) activeItems.push({ label: 'Pregnant', icon: '🤰' })

  if (activeItems.length === 0) {
    return <span className="vuln-none">None flagged</span>
  }

  return (
    <div className="vuln-badges-list">
      {activeItems.map((item) => (
        <span key={item.label} className="vuln-badge">
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </span>
      ))}
    </div>
  )
}

/* ----------------------------------------------------------------- */
/** Localized Weather & Active Flood Warning Banner */
export function WeatherAlertBanner() {
  const [showHotlines, setShowHotlines] = useState(false)

  return (
    <>
      <div className="weather-alert-banner" role="region" aria-label="Weather & Flood Warning">
        <div className="weather-alert-left">
          <div className="weather-pulse-dot" aria-hidden="true" />
          <div className="weather-alert-text">
            <div className="weather-alert-headline">
              <span className="weather-tag red-warning">CONTROLLED FLOOD SCENARIO</span>
              <span className="weather-station">U-Belt Pilot · Controlled Scenario</span>
              <span className="weather-storm-name">Synthetic Heavy-Rain Demonstration</span>
            </div>
            <p className="weather-alert-sub">
              Scenario rainfall: <strong>28.4 mm/hr (Heavy to Torrential)</strong>. Synthetic high-flood
              conditions apply to selected U-Belt edges; these are not current observations.
            </p>
          </div>
        </div>

        <div className="weather-alert-actions">
          <button
            type="button"
            className="weather-hotline-btn"
            onClick={() => setShowHotlines(true)}
          >
            <Icon name="phone" size={15} />
            <span>Emergency Hotlines</span>
          </button>
        </div>
      </div>

      <EmergencyHotlinesModal
        isOpen={showHotlines}
        onClose={() => setShowHotlines(false)}
      />
    </>
  )
}

/* ----------------------------------------------------------------- */
/** Emergency Hotlines Modal */
export function EmergencyHotlinesModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const hotlines = [
    { name: 'National Emergency Hotline', number: '911', agency: 'NDRRMC / DILG' },
    { name: 'Philippine Red Cross', number: '143 / (02) 8790-2300', agency: 'Search & Rescue' },
    { name: 'Manila DRRMO Operations', number: '(02) 8527-5174', agency: 'City Disaster Risk Reduction' },
    { name: 'Philippine Coast Guard', number: '(02) 8527-8481', agency: 'Amphibious & Flood Rescue' },
    { name: 'BFP Emergency Rescue', number: '(02) 8426-0219', agency: 'Bureau of Fire Protection' },
    { name: 'MMDA Flood Control', number: '136', agency: 'Metro Manila Dev. Authority' },
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Official Emergency Hotlines"
      subtitle="Public emergency numbers shown for reference; ResQPH is not connected to these agencies."
    >
      <div className="hotline-grid">
        {hotlines.map((h) => (
          <div key={h.name} className="hotline-item">
            <div className="hotline-item__info">
              <span className="hotline-item__name">{h.name}</span>
              <span className="hotline-item__agency">{h.agency}</span>
            </div>
            <a href={`tel:${h.number.split('/')[0].trim()}`} className="hotline-item__call">
              <Icon name="phone" size={14} />
              <span>{h.number}</span>
            </a>
          </div>
        ))}
      </div>
      <p className="hotline-note">
        ResQPH operates as an academic flood-aware coordination prototype. In imminent danger, also
        contact local emergency hotlines immediately.
      </p>
    </Modal>
  )
}

/* ----------------------------------------------------------------- */
/** What to do during severe flooding — Emergency Survival Guidelines */
export function EmergencyPreparednessGuide() {
  const guidelines = [
    {
      num: '01',
      title: 'Move to Higher Ground',
      desc: 'Move infants, senior citizens, and essential medications to the 2nd floor, attic, or roof terrace if water enters ground levels. Never delay evacuation until nightfall.',
      icon: 'pin' as IconName,
    },
    {
      num: '02',
      title: 'Shut Off Main Circuit Breaker & LPG',
      desc: 'Switch off the main electrical breaker before floodwater contacts wall outlets to prevent fatal electrocution and water contamination.',
      icon: 'warning' as IconName,
    },
    {
      num: '03',
      title: 'Signal Incoming Rescue Boats',
      desc: 'Display a bright-colored cloth, white towel, or flashlight from an upper window or balcony. Do NOT attempt to swim or wade through fast-moving waist/chest currents.',
      icon: 'shield' as IconName,
    },
    {
      num: '04',
      title: 'Keep Distress Tracking Active',
      desc: 'Keep the latest assigned mission cached when available. Conserve battery and remember that the prototype does not provide continuous GPS monitoring during connection loss.',
      icon: 'boat' as IconName,
    },
    {
      num: '05',
      title: 'Avoid Floodwater Contamination',
      desc: 'Do not consume tap water in flooded zones due to sewage backflow. Drink only bottled water or boiled potable water to prevent leptospirosis and waterborne infections.',
      icon: 'medical' as IconName,
    },
  ]

  return (
    <div className="preparedness-guide" role="region" aria-label="What to do during flooding">
      <div className="guide-header">
        <div className="guide-header__left">
          <Icon name="shield" size={20} />
          <h3>What To Do During Severe Flooding</h3>
        </div>
        <span className="guide-tag">Citizen Safety Protocol</span>
      </div>

      <div className="guide-grid">
        {guidelines.map((g) => (
          <div key={g.num} className="guide-card">
            <div className="guide-card__top">
              <span className="guide-card__num">{g.num}</span>
              <Icon name={g.icon} size={18} />
            </div>
            <h4>{g.title}</h4>
            <p>{g.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export type { RequestStatus }
