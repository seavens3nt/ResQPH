import { Icon, type IconName } from '../../../../components/art/Icon'

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
