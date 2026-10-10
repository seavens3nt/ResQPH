import type { HTMLAttributes, ReactNode } from 'react'
import { Icon, type IconName } from '../../components/art/Icon'
import { FigmaHomeAsset } from './FigmaHomeAsset'

/** Same section hierarchy as Citizen Home, with each workspace's own label. */
export function WorkspaceSectionHeading({children, icon}: {children: ReactNode; icon?: IconName}) {
  return <h2 className="workspace-section-heading">{icon ? <Icon name={icon} size={26}/> : <FigmaHomeAsset name="star"/>}<span>{children}</span></h2>
}

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: 'section' | 'article' | 'aside' | 'div'
}

/** Shared surface; keeps semantic elements, accessibility attributes and role-specific styling. */
export function WorkspaceCard({ as: Element = 'section', className, ...props }: CardProps) {
  return <Element className={['workspace-card', className].filter(Boolean).join(' ')} {...props} />
}

export function WorkspaceBadge({ as: Element = 'span', status, children, className, ...props }: HTMLAttributes<HTMLSpanElement> & {
  as?: 'span' | 'small'
  status?: string
}) {
  return <Element className={['workspace-badge', status && `state-${status}`, className].filter(Boolean).join(' ')} {...props}>{children ?? status}</Element>
}

export function WorkspaceFilters<T extends string>({ options, value, onChange, label, children }: {
  options: readonly T[]
  value: T
  onChange: (value: T) => void
  label: string
  children?: ReactNode
}) {
  return <div className="workspace-tabs" role="group" aria-label={label}>
    {options.map(option => <button type="button" key={option} aria-pressed={value === option} onClick={() => onChange(option)}>{option}</button>)}
    {children}
  </div>
}

export function WorkspaceStatCard({ count, label, icon, tone, onClick }: {
  count: number
  label: string
  icon: IconName
  tone: 'pending' | 'teams' | 'active' | 'completed'
  onClick: () => void
}) {
  return <button type="button" className={`stat-${tone}`} aria-label={`${count} ${label}`} onClick={onClick}>
    <Icon name={icon} size={28}/><span><strong>{count}</strong><small>{label}</small></span>
  </button>
}

/** Owns the responsive table shell; callers retain typed rows and their action handlers. */
export function WorkspaceTable({ headings, caption, children }: {
  headings: readonly string[]
  caption?: string
  children: ReactNode
}) {
  return <div className="workspace-table-panel"><div className="workspace-table-wrap"><table className="workspace-table">
    {caption && <caption>{caption}</caption>}
    <thead><tr>{headings.map(heading => <th key={heading} scope="col">{heading}</th>)}</tr></thead>
    <tbody>{children}</tbody>
  </table></div></div>
}

/** Shared list/map + inspector composition. Domain selection remains with the caller. */
export function WorkspaceSplit({ children, inspector, className = '' }: {
  children: ReactNode
  inspector: ReactNode
  className?: string
}) {
  return <div className={`workspace-split ${className}`}><div className="workspace-split-content">{children}</div><aside className="workspace-inspector">{inspector}</aside></div>
}

export function WorkspaceFacts({ items }: { items: readonly { label: string; value: ReactNode }[] }) {
  return <dl className="workspace-facts">{items.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
}

export function WorkspaceTimeline({ events, label = 'Status history' }: {
  events: readonly { id: string; status: string; timestamp: string; note?: string | null }[]
  label?: string
}) {
  return <ol className="workspace-timeline" aria-label={label}>{events.map(event => <li key={event.id}><Icon name="check" size={16}/><div><strong>{event.status.replaceAll('-', ' ')}</strong><time dateTime={event.timestamp}>{new Date(event.timestamp).toLocaleString()}</time>{event.note && <p>{event.note}</p>}</div></li>)}</ol>
}

export function WorkspaceProgress({ stages, current, label }: {
  stages: readonly { value: string; label: string }[]
  current: string
  label: string
}) {
  const index = stages.findIndex(stage => stage.value === current)
  return <ol className="workspace-progress" aria-label={label} style={{gridTemplateColumns:`repeat(${stages.length}, minmax(0, 1fr))`}}>{stages.map((stage, position) => <li key={stage.value} className={position <= index ? 'is-reached' : undefined} aria-current={stage.value === current ? 'step' : undefined}><Icon name={position < index ? 'check' : 'pin'} size={18}/><span>{stage.label}</span></li>)}</ol>
}

export function WorkspaceEmpty({ title, children, icon = 'report', action }: {
  title: string
  children: ReactNode
  icon?: IconName
  action?: ReactNode
}) {
  return <div className="workspace-empty"><Icon name={icon} size={32}/><h3>{title}</h3><p>{children}</p>{action}</div>
}
