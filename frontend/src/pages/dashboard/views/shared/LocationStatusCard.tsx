import { Icon } from '../../../../components/art/Icon'

interface LocationStatusCardProps {
  title: string
  coordinates: string
  statusLabel: string
}

export function LocationStatusCard({ title, coordinates, statusLabel }: LocationStatusCardProps) {
  return (
    <div className="location-status-card modern-clean-card">
      <div className="location-status-card__identity">
        <span className="location-status-card__icon">
          <Icon name="navigation" size={18} />
        </span>
        <div>
          <h3>{title}</h3>
          <span className="location-status-card__coordinates font-mono">{coordinates}</span>
        </div>
      </div>

      <div className="location-status-card__status">
        <span className="location-status-card__status-dot" aria-hidden="true" />
        <span>{statusLabel}</span>
      </div>
    </div>
  )
}
