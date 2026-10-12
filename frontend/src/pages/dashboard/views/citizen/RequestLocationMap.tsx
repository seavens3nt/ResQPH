import { LocationOptions } from '../../../../features/map/LocationOptions'
import { InteractiveFloodMap } from '../../../../features/map/InteractiveFloodMap'

type LocationSource = 'gps' | 'demo' | 'map'

interface RequestLocationMapProps {
  coordinates: [number, number]
  source: LocationSource
  isLocating: boolean
  disabled: boolean
  gpsError: string
  showSourceControls?: boolean
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
  onChooseSource,
  onChooseCoordinates,
  locationConfirmed = true,
  onConfirmLocation,
  showConfirmation = true,
}: RequestLocationMapProps) {
  const controls = showSourceControls && <LocationOptions source={source} disabled={disabled || isLocating} onChooseSource={onChooseSource}/>

  return <section className="request-location-map" aria-label="Choose rescue request location on Google map" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
    <InteractiveFloodMap compact showRouteStatus={false} center={[coordinates[1], coordinates[0]]} controlsSlot={controls} onMapClick={point => { if (!disabled) onChooseCoordinates(point) }} records={[{ id: 'selected-incident', label: 'Selected rescue location', coordinates }]} draggableRecordIds={disabled ? [] : ['selected-incident']} onRecordDragEnd={(_id, point) => { if (!disabled) onChooseCoordinates(point) }}/>
    {isLocating && <p role="status">Getting GPS location…</p>}
    {gpsError && <p role="alert">{gpsError}</p>}
    {!disabled && source !== 'map' && <span style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>{source === 'gps' ? 'GPS location selected. Check its accuracy and adjust the pin if needed.' : 'Demonstration location selected. Choose or adjust a pin before confirming.'}</span>}
    {showConfirmation && <div className="request-location-confirmation">
      <p role="status">{locationConfirmed ? 'Location confirmed.' : 'Drop a pin, then confirm your rescue location.'}</p>
      <button className="request-confirm-location" type="button" onClick={onConfirmLocation} disabled={disabled || isLocating}>Use this rescue location</button>
    </div>}
  </section>
}
