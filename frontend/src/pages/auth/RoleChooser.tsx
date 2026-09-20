import { type UserRole } from '../../features/auth/types'
import { Icon, type IconName } from '../../components/art/Icon'

const roleIcon: Record<UserRole, IconName> = {
  citizen: 'pin',
  rescuer: 'boat',
  coordinator: 'shield',
}

const order: UserRole[] = ['citizen', 'rescuer', 'coordinator']

const roleDisplayNames: Record<UserRole, string> = {
  citizen: 'Citizen',
  rescuer: 'Rescuer',
  coordinator: 'Dispatcher',
}

interface RoleChooserProps {
  value: UserRole
  onChange: (role: UserRole) => void
}

/** Segmented modern pill role picker used on login and signup */
export function RoleChooser({ value, onChange }: RoleChooserProps) {
  return (
    <div className="role-segmented" role="radiogroup" aria-label="Select your role">
      {order.map((role) => {
        const selected = role === value
        return (
          <button
            key={role}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`role-segmented__btn${selected ? ' is-selected' : ''}`}
            onClick={() => onChange(role)}
          >
            <Icon name={roleIcon[role]} size={14} />
            <span>{roleDisplayNames[role]}</span>
          </button>
        )
      })}
    </div>
  )
}
