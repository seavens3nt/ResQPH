import type { ReactNode } from 'react'
import { Icon, type IconName } from '../../../components/art/Icon'
import type { NavSection } from '../views/navTypes'

interface SidebarNavItemProps {
  section: NavSection
  activeSection: NavSection
  icon: IconName
  label: string
  onSelect: (section: NavSection) => void
  indicator?: ReactNode
}

export function SidebarNavItem({
  section,
  activeSection,
  icon,
  label,
  onSelect,
  indicator,
}: SidebarNavItemProps) {
  return (
    <button
      type="button"
      className={`modern-nav-item ${activeSection === section ? 'is-active' : ''}`}
      onClick={() => onSelect(section)}
    >
      <Icon name={icon} size={18} />
      <span>{label}</span>
      {indicator}
    </button>
  )
}
