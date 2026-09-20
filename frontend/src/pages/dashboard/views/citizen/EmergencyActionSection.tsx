import { useState } from 'react'
import { Icon } from '../../../../components/art/Icon'
import './EmergencyActionSection.css'

interface EmergencyActionSectionProps {
  mode?: 'citizen' | 'volunteer'
  onRequestRescue?: () => void
  onReportHazard?: () => void
}

export function EmergencyActionSection({
  mode = 'citizen',
  onRequestRescue,
  onReportHazard,
}: EmergencyActionSectionProps) {
  const [activeTab, setActiveTab] = useState<'primary' | 'hazard'>('primary')

  const isVolunteer = mode === 'volunteer'

  return (
    <div className="emergency-action-container">
      {/* HEADER TITLE */}
      <div className="action-header">
        <div className="action-title-group">
          <div className="action-icon-badge">
            <Icon name="alert" size={18} />
          </div>
          <div>
            <h2 className="action-heading">
              {isVolunteer
                ? 'Field Missions & Hazard Center'
                : 'Emergency Dispatch & Hazard Center'}
            </h2>
          </div>
        </div>
      </div>

      {/* ACTION SELECTOR BUTTONS GRID */}
      <div className="action-buttons-grid">
        {/* PRIMARY ACTION BUTTON */}
        <button
          type="button"
          className={`neu-action-btn primary-red ${activeTab === 'primary' ? 'is-active' : ''}`}
          onClick={() => {
            setActiveTab('primary')
            onRequestRescue?.()
          }}
        >
          <div className="btn-icon-wrapper white-glow">
            <Icon name={isVolunteer ? 'map-fold' : 'shield'} size={20} />
          </div>
          <div className="btn-text-content">
            <span className="btn-title">
              {isVolunteer ? 'ACTIVE FIELD MISSIONS' : 'REQUEST EMERGENCY RESCUE'}
            </span>
            <span className="btn-desc">
              {isVolunteer
                ? 'Track live response units and route advisories'
                : 'Priority dispatch for trapped or flood-affected citizens'}
            </span>
          </div>
          <Icon name="arrow-right" size={16} className="btn-arrow" />
        </button>

        {/* SECONDARY ACTION: REPORT LOCAL HAZARD */}
        <button
          type="button"
          className={`neu-action-btn secondary-red-outline ${activeTab === 'hazard' ? 'is-active' : ''}`}
          onClick={() => {
            setActiveTab('hazard')
            onReportHazard?.()
          }}
        >
          <div className="btn-icon-wrapper red-soft-bg">
            <Icon name="pin" size={20} />
          </div>
          <div className="btn-text-content">
            <span className="btn-title">REPORT LOCAL HAZARD</span>
            <span className="btn-desc">Log flood depths, blocked roads, or powerlines</span>
          </div>
          <Icon name="arrow-right" size={16} className="btn-arrow" />
        </button>
      </div>

      {/* FOOTER NOTE (CITIZEN MODE ONLY) */}
      {!isVolunteer && (
        <div className="action-footer-note">
          <div className="note-left">
            <Icon name="clock" size={14} />
            <span>Avg Response: <strong>8–12 mins (Sampaloc Zone)</strong></span>
          </div>
          <span className="live-status-pill">● Dispatchers Online</span>
        </div>
      )}
    </div>
  )
}