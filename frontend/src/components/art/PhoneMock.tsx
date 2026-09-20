import { Icon } from './Icon'
import './PhoneMock.css'

/**
 * Stylized phone showing the ResQPH citizen app: an emergency alert banner,
 * a schematic map with a rescue pin, coordinates, and a "Request Help" button.
 * Pure CSS/SVG so it needs no image assets.
 */
export function PhoneMock() {
  return (
    <div className="phone" role="img" aria-label="ResQPH mobile app preview showing an emergency alert and location on a map">
      <div className="phone__notch" aria-hidden="true" />
      <div className="phone__screen">
        <div className="phone__statusbar" aria-hidden="true">
          <span>9:41</span>
          <span className="phone__dots">
            <i /><i /><i />
          </span>
        </div>

        <div className="phone__alert">
          <span className="phone__alert-icon">
            <Icon name="alert" size={16} />
          </span>
          <div>
            <strong>Emergency Alert</strong>
            <span>Flooding in your area. Stay safe.</span>
          </div>
        </div>

        <div className="phone__map" aria-hidden="true">
          <svg viewBox="0 0 220 200" preserveAspectRatio="xMidYMid slice">
            <g stroke="rgb(255 255 255 / 10%)" strokeWidth="1" fill="none">
              <path d="M0 60 H220 M0 120 H220 M60 0 V200 M150 0 V200" />
              <path d="M-10 150 C 60 120, 120 170, 230 130" stroke="rgb(216 52 43 / 30%)" strokeWidth="6" />
            </g>
            <path d="M20 30 L80 50 L70 110 L15 95 Z" fill="rgb(255 255 255 / 4%)" />
            <path d="M150 20 L205 40 L200 100 L145 85 Z" fill="rgb(255 255 255 / 4%)" />
          </svg>
          <span className="phone__pin">
            <Icon name="pin" size={26} />
          </span>
        </div>

        <div className="phone__loc">
          <span className="phone__loc-label">Your location</span>
          <span className="phone__loc-coords">14.6091° N, 121.0223° E</span>
        </div>

        <button className="phone__cta" type="button" tabIndex={-1}>
          Request Help
        </button>

        <div className="phone__tabbar" aria-hidden="true">
          <span className="is-active"><Icon name="pin" size={18} /></span>
          <span><Icon name="alert" size={18} /></span>
          <span><Icon name="shield" size={18} /></span>
        </div>
      </div>
    </div>
  )
}
