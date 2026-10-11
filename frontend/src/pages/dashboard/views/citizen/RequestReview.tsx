import { RequestLocationMap } from './RequestLocationMap'

interface RequestReviewProps {
  coordinates: [number, number]
  source: 'gps' | 'demo' | 'map'
  address: string
  landmark: string
  headcount: string
  floodLevel: string
  severity: string
  situation: string
  accessibility: string
  medical: string
}

export function RequestReview({coordinates, source, address, landmark, headcount, floodLevel, severity, situation, accessibility, medical}: RequestReviewProps) {
  const items = [
    ['People needing help', headcount],
    ['Nearby landmark', landmark || 'None provided'],
    ['Reported severity', severity.charAt(0).toUpperCase() + severity.slice(1)],
    ['Observed flood level', floodLevel.charAt(0).toUpperCase() + floodLevel.slice(1)],
    ['Situation summary', situation || 'None reported'],
    ['Accessibility needs', accessibility || 'None reported'],
    ['Medical needs', medical || 'None reported'],
  ]
  return <div className="request-review request-review-figma">
    <div className="request-review-location request-location-fields">
      <div className="request-review-location-card">
        <RequestLocationMap coordinates={coordinates} source={source} showInstruction={false} showConfirmation={false} isLocating={false} disabled gpsError="" onChooseSource={() => {}} onChooseCoordinates={() => {}}/>
        <p className="workspace-caption">Confirmed rescue pin · {coordinates[0].toFixed(6)}, {coordinates[1].toFixed(6)} (longitude, latitude)</p>
        <label htmlFor="review-request-address">Pinned location{address.trim() ? ' · optional address' : ''}</label>
        <input id="review-request-address" type="text" value={address.trim() || 'Pinned location'} readOnly aria-label="Reviewed pinned location"/>
      </div>
      <p className="workspace-caption">The confirmed pin and optional address note will be included with this request.</p>
    </div>
    <section className="request-review-summary" aria-label="Request summary">
      <h3 tabIndex={-1}>Review rescue request</h3>
      <dl>{items.map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </section>
  </div>
}
