import { useEffect, useId, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

type LocationSource = 'profile' | 'gps' | 'demo' | 'map'

interface RequestLocationMapProps {
  coordinates: [number, number]
  source: LocationSource
  hasSavedLocation: boolean
  isLocating: boolean
  disabled: boolean
  gpsError: string
  onChooseSource: (source: 'profile' | 'gps' | 'demo') => void
  onChooseCoordinates: (coordinates: [number, number]) => void
}

export function RequestLocationMap({
  coordinates,
  source,
  hasSavedLocation,
  isLocating,
  disabled,
  gpsError,
  onChooseSource,
  onChooseCoordinates,
}: RequestLocationMapProps) {
  const uid = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.CircleMarker | null>(null)
  const onChooseCoordinatesRef = useRef(onChooseCoordinates)
  onChooseCoordinatesRef.current = onChooseCoordinates

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    try {
      const map = L.map(containerRef.current, { zoomControl: true }).setView([14.6042, 120.9946], 15)
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map)
      const marker = L.circleMarker([14.6042, 120.9946], {
        radius: 8,
        color: '#fff',
        weight: 3,
        fillColor: '#dc2626',
        fillOpacity: 1,
      }).addTo(map)
      map.on('click', (event: L.LeafletMouseEvent) => {
        onChooseCoordinatesRef.current([event.latlng.lng, event.latlng.lat])
      })
      mapRef.current = map
      markerRef.current = marker
    } catch (error) {
      console.warn('Request location map could not initialize:', error)
    }

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const marker = markerRef.current
    if (!map || !marker || !coordinates.every(Number.isFinite)) return
    const latLng: L.LatLngExpression = [coordinates[1], coordinates[0]]
    marker.setLatLng(latLng)
    map.panTo(latLng)
  }, [coordinates])

  const radioStyle = { display: 'flex', gap: '0.35rem', alignItems: 'flex-start', fontSize: '0.74rem', color: '#334155' }

  return (
    <section aria-label="Choose rescue request location on map" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <div style={{ position: 'relative', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
        <div ref={containerRef} aria-label="U-Belt pilot map. Select a point to set the request location." style={{ height: '260px', width: '100%', background: '#e2e8f0' }} />
        <fieldset style={{ position: 'absolute', zIndex: 1000, top: '0.6rem', left: '0.6rem', margin: 0, padding: '0.55rem 0.65rem', maxWidth: '220px', border: '1px solid #cbd5e1', borderRadius: '8px', background: 'rgba(255,255,255,0.96)', boxShadow: '0 2px 8px rgba(15,23,42,0.14)' }}>
          <legend style={{ padding: '0 3px', color: '#0f172a', fontSize: '0.75rem', fontWeight: 700 }}>Location source</legend>
          <label style={radioStyle}>
            <input type="radio" name={`${uid}-location-source`} checked={source === 'gps'} disabled={disabled || isLocating} onChange={() => onChooseSource('gps')} />
            <span>Use current GPS</span>
          </label>
          <label style={{ ...radioStyle, color: hasSavedLocation ? '#334155' : '#94a3b8' }}>
            <input type="radio" name={`${uid}-location-source`} checked={source === 'profile'} disabled={!hasSavedLocation || disabled || isLocating} onChange={() => onChooseSource('profile')} />
            <span>Use saved account location</span>
          </label>
          <label style={radioStyle}>
            <input type="radio" name={`${uid}-location-source`} checked={source === 'demo'} disabled={disabled || isLocating} onChange={() => onChooseSource('demo')} />
            <span>Use demo location</span>
          </label>
          {isLocating && <span role="status" style={{ display: 'block', marginTop: '0.35rem', fontSize: '0.72rem', color: '#475569' }}>Getting GPS location…</span>}
          {gpsError && <span role="alert" style={{ display: 'block', marginTop: '0.35rem', fontSize: '0.72rem', color: '#b91c1c' }}>{gpsError}</span>}
        </fieldset>
      </div>
      {!hasSavedLocation && <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Set a saved address and coordinates in Edit profile to use your account location.</span>}
      {source === 'gps' && <span style={{ fontSize: '0.74rem', color: '#475569' }}>GPS coordinates selected. Add the nearest street address below. Your browser may ask you to allow location access.</span>}
      {source === 'map' && <span style={{ fontSize: '0.74rem', color: '#475569' }}>Map point selected. Add its street address or a nearby landmark below.</span>}
      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Controlled U-Belt pilot map. Click the map to place the request marker; coordinates outside the pilot boundary cannot be submitted.</span>
    </section>
  )
}
