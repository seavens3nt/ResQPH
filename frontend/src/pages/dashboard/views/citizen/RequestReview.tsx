import { RequestLocationMap } from './RequestLocationMap'

interface RequestReviewProps {
  coordinates: [number, number]
  source: 'gps' | 'demo' | 'map'
  address: string
  headcount: string
  floodLevel: string
  situation: string
  accessibility: string
  medical: string
}

export function RequestReview({coordinates, source, address, headcount, floodLevel, situation, accessibility, medical}: RequestReviewProps) {
  const items = [
    ['People needing help', headcount],
    ['Observed flood level', floodLevel.charAt(0).toUpperCase() + floodLevel.slice(1)],
    ['Situation summary', situation || 'None reported'],
    ['Accessibility needs', accessibility || 'None reported'],
    ['Medical needs', medical || 'None reported'],
  ]
  return <div className="request-review request-review-figma">
    <div className="request-review-location request-location-fields">
      <div className="request-review-location-card">
        <RequestLocationMap coordinates={coordinates} source={source} showInstruction={false} isLocating={false} disabled gpsError="" onChooseSource={() => {}} onChooseCoordinates={() => {}}/>
        <label htmlFor="review-request-address">Location - Street Address</label>
        <input id="review-request-address" type="text" value={address} readOnly aria-label="Reviewed street address"/>
      </div>
      <p className="workspace-caption">Controlled U-Belt pilot map. Click the map to place the request marker; coordinates outside the pilot boundary cannot be submitted.</p>
    </div>
    <section className="request-review-summary" aria-label="Request summary">
      <h3 tabIndex={-1}>Review rescue request</h3>
      <dl>{items.map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </section>
  </div>
}
