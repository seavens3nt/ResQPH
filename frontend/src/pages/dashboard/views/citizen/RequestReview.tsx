import { RequestLocationMap } from './RequestLocationMap'
import { useEffect, useState } from 'react'
import { resolvePinnedAddress } from '../../../../features/map/InteractiveFloodMap'

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
  const [lng, lat] = coordinates
  const pinKey = `${lng},${lat}`
  const [lookup, setLookup] = useState<{ key: string; address: string | null } | null>(null)
  useEffect(() => {
    let active = true
    const timeout = window.setTimeout(() => {
      if (active) { active = false; setLookup({ key: pinKey, address: null }) }
    }, 10000)
    void Promise.resolve().then(() => resolvePinnedAddress(lng, lat)).then(value => {
      if (active) setLookup({ key: pinKey, address: value })
    }).catch(() => {
      if (active) setLookup({ key: pinKey, address: null })
    }).finally(() => window.clearTimeout(timeout))
    return () => { active = false; window.clearTimeout(timeout) }
  }, [lng, lat, pinKey])
  const currentLookup = lookup?.key === pinKey ? lookup : null
  const pinnedAddress = currentLookup?.address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
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
    <div className="request-review-location">
      <div className="request-review-location-card">
        <RequestLocationMap coordinates={coordinates} source={source} showConfirmation={false} isLocating={false} disabled gpsError="" onChooseSource={() => {}} onChooseCoordinates={() => {}}/>
        <div className="request-review-address">
        <label htmlFor="review-request-address">Pinned location</label>
        <input id="review-request-address" type="text" value={pinnedAddress} title={pinnedAddress} readOnly aria-label="Reviewed pinned location" aria-describedby="review-pin-lookup"/>
        <span id="review-pin-lookup" className="workspace-caption" role="status">{!currentLookup ? 'Looking up the pinned address…' : currentLookup.address ? 'Address from Google Maps for the selected pin.' : 'Address lookup unavailable. Showing the pinned coordinates.'}</span>
        {address.trim() && <p className="workspace-caption">Optional address note: {address.trim()}</p>}
        </div>
      </div>
      <p className="workspace-caption">The confirmed pin and optional address note will be included with this request.</p>
    </div>
    <section className="request-review-summary" aria-label="Request summary">
      <h3 tabIndex={-1}>Review rescue request</h3>
      <dl>{items.map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </section>
  </div>
}
