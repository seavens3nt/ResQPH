import { useId } from 'react'
import { InteractiveFloodMap } from '../../../../features/map/InteractiveFloodMap'

type LocationSource = 'gps' | 'demo' | 'map'

interface RequestLocationMapProps {
  coordinates: [number, number]
  source: LocationSource
  isLocating: boolean
  disabled: boolean
  gpsError: string
  showSourceControls?: boolean
  showInstruction?: boolean
  onChooseSource: (source: 'gps' | 'demo') => void
  onChooseCoordinates: (coordinates: [number, number]) => void
  locationConfirmed?: boolean
  onConfirmLocation?: () => void
  showConfirmation?: boolean
}

export function RequestLocationMap({
  coordinates,
  source,
  isLocating,
  disabled,
  gpsError,
  showSourceControls = true,
  showInstruction = true,
  onChooseSource,
  onChooseCoordinates,
  locationConfirmed = true,
  onConfirmLocation,
  showConfirmation = true,
}: RequestLocationMapProps) {
  const uid = useId()
  const radioStyle = { display: 'flex', gap: '0.35rem', alignItems: 'flex-start', fontSize: '0.74rem', color: '#334155' }
  const controls = showSourceControls && <fieldset disabled={disabled || isLocating} style={{ margin: 8, padding: '0.55rem 0.65rem', maxWidth: 220, border: '1px solid #cbd5e1', borderRadius: 8, background: 'rgba(255,255,255,0.96)', boxShadow: '0 2px 8px rgba(15,23,42,0.14)' }}>
    <legend style={{ padding: '0 3px', color: '#0f172a', fontSize: '0.75rem', fontWeight: 700 }}>Location source</legend>
    <label style={radioStyle}><input type="radio" name={`${uid}-location-source`} checked={source === 'gps'} onChange={() => onChooseSource('gps')} /><span>Use my location</span></label>
    <label style={radioStyle}><input type="radio" name={`${uid}-location-source`} checked={source === 'demo'} onChange={() => onChooseSource('demo')} /><span>Use demo location</span></label>
    {isLocating && <span role="status">Getting GPS location…</span>}
    {gpsError && <span role="alert">{gpsError}</span>}
  </fieldset>

  return <section className="request-location-map" aria-label="Choose rescue request location on Google map" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
    <InteractiveFloodMap compact center={[coordinates[1], coordinates[0]]} controlsSlot={controls} onMapClick={point => { if (!disabled) onChooseCoordinates(point) }} records={[{ id: 'selected-incident', label: 'Selected rescue location', coordinates }]} draggableRecordIds={disabled ? [] : ['selected-incident']} onRecordDragEnd={(_id, point) => { if (!disabled) onChooseCoordinates(point) }}/>
    <span style={{ fontSize: '0.74rem', color: '#475569' }}>{source === 'gps' ? 'GPS location selected. Check its accuracy and adjust the pin if needed.' : source === 'map' ? 'Pinned location selected. Drag the pin or enter coordinates below to refine it.' : 'Demonstration location selected. You can choose a point on the map or enter coordinates.'}</span>
    {showConfirmation && <div className="request-location-confirmation">
      <p role="status">{locationConfirmed ? 'Rescue location confirmed.' : 'Review the pin, then confirm this rescue location.'}</p>
      <button type="button" onClick={onConfirmLocation} disabled={disabled}>Use this rescue location</button>
    </div>}
    {showInstruction && <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Controlled U-Belt pilot map. Click the map to place the request marker; coordinates outside the pilot boundary cannot be submitted.</span>}
  </section>
}
