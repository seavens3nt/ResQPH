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
  const controls = showSourceControls && <LocationOptions source={source} disabled={disabled || isLocating} onChooseSource={onChooseSource}/>

  return <section className="request-location-map" aria-label="Choose rescue request location on Google map" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
    <InteractiveFloodMap compact center={[coordinates[1], coordinates[0]]} controlsSlot={controls} onMapClick={point => { if (!disabled) onChooseCoordinates(point) }} records={[{ id: 'selected-incident', label: 'Selected rescue location', coordinates }]} draggableRecordIds={disabled ? [] : ['selected-incident']} onRecordDragEnd={(_id, point) => { if (!disabled) onChooseCoordinates(point) }}/>
    {isLocating && <p role="status">Getting GPS location…</p>}
    {gpsError && <p role="alert">{gpsError}</p>}
    <span style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>{disabled ? 'Selected rescue location.' : source === 'gps' ? 'GPS location selected. Check its accuracy and adjust the pin if needed.' : source === 'map' ? 'Pinned location selected. Drag the pin or use the adjustment buttons to refine it.' : 'Demonstration location selected. Choose or adjust a pin before confirming.'}</span>
    {!disabled && <div className="request-pin-adjustment" role="group" aria-label="Adjust rescue pin">
      <p>Use Tab and Enter on these buttons to move the pin approximately 10 metres.</p>
      {([['North', 0, 0.00009], ['South', 0, -0.00009], ['West', -0.000093, 0], ['East', 0.000093, 0]] as const).map(([direction, lng, lat]) => <button type="button" key={direction} disabled={isLocating} onClick={() => onChooseCoordinates([coordinates[0] + lng, coordinates[1] + lat])}>Move pin {direction.toLowerCase()}</button>)}
    </div>}
    {showConfirmation && <div className="request-location-confirmation">
      <p role="status">{locationConfirmed ? 'Location confirmed.' : 'Drop a pin, then confirm your rescue location.'}</p>
      <button className="request-confirm-location" type="button" onClick={onConfirmLocation} disabled={disabled || isLocating}>Use this rescue location</button>
    </div>}
    {showInstruction && <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Controlled U-Belt pilot map. Click the map to place the request marker; locations outside the pilot boundary cannot be submitted.</span>}
  </section>
}
