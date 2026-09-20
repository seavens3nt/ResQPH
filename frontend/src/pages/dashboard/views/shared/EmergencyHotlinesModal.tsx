import { Icon } from '../../../../components/art/Icon'
import { Modal } from '../../../../components/ui/Modal'

const HOTLINES = [
  { name: 'National Emergency Hotline', number: '911', agency: 'NDRRMC / DILG' },
  { name: 'Philippine Red Cross', number: '143 / (02) 8790-2300', agency: 'Search & Rescue' },
  { name: 'Manila DRRMO Operations', number: '(02) 8527-5174', agency: 'City Disaster Risk Reduction' },
  { name: 'Philippine Coast Guard', number: '(02) 8527-8481', agency: 'Amphibious & Flood Rescue' },
  { name: 'BFP Emergency Rescue', number: '(02) 8426-0219', agency: 'Bureau of Fire Protection' },
  { name: 'MMDA Flood Control', number: '136', agency: 'Metro Manila Dev. Authority' },
]

interface EmergencyHotlinesModalProps {
  isOpen: boolean
  onClose: () => void
}

export function EmergencyHotlinesModal({ isOpen, onClose }: EmergencyHotlinesModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Official Emergency Hotlines"
      subtitle="Direct response coordination numbers for Metro Manila emergency units."
    >
      <div className="hotline-grid">
        {HOTLINES.map((hotline) => (
          <div key={hotline.name} className="hotline-item">
            <div className="hotline-item__info">
              <span className="hotline-item__name">{hotline.name}</span>
              <span className="hotline-item__agency">{hotline.agency}</span>
            </div>
            <a href={`tel:${hotline.number.split('/')[0].trim()}`} className="hotline-item__call">
              <Icon name="phone" size={14} />
              <span>{hotline.number}</span>
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
