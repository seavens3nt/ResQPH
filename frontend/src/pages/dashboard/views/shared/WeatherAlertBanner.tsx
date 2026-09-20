import { useState } from 'react'
import { Icon } from '../../../../components/art/Icon'
import { EmergencyHotlinesModal } from './EmergencyHotlinesModal'

export function WeatherAlertBanner() {
  const [showHotlines, setShowHotlines] = useState(false)

  return (
    <>
      <div className="weather-alert-banner" role="region" aria-label="Weather & Flood Warning">
        <div className="weather-alert-left">
          <div className="weather-pulse-dot" aria-hidden="true" />
          <div className="weather-alert-text">
            <div className="weather-alert-headline">
              <span className="weather-tag red-warning">RED RAINFALL WARNING</span>
              <span className="weather-station">Metro Manila · PAGASA Warning No. 04</span>
              <span className="weather-storm-name">Habagat (Southwest Monsoon)</span>
            </div>
            <p className="weather-alert-sub">
              Rainfall intensity: <strong>28.4 mm/hr (Heavy to Torrential)</strong>. High flood risk in
              low-lying areas of Sampaloc, España, and Loyola St. Road passability dynamically monitored.
            </p>
          </div>
        </div>

        <div className="weather-alert-actions">
          <button type="button" className="weather-hotline-btn" onClick={() => setShowHotlines(true)}>
            <Icon name="phone" size={15} />
            <span>Emergency Hotlines</span>
          </button>
        </div>
      </div>

      <EmergencyHotlinesModal isOpen={showHotlines} onClose={() => setShowHotlines(false)} />
    </>
  )
}
