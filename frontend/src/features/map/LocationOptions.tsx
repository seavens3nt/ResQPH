import { useEffect, useId, useRef, useState } from 'react'

/** Nonmodal map control. Opening it never requests location permission. */
export function LocationOptions({source, disabled, onChooseSource, gpsLabel = 'Use my location'}: {
  source: 'gps' | 'demo' | 'map'
  disabled: boolean
  onChooseSource: (source: 'gps' | 'demo') => void
  gpsLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        const focusInside = root.current?.contains(document.activeElement)
        setOpen(false)
        if (focusInside) trigger.current?.focus()
      }
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus() }
    }
    document.addEventListener('pointerdown', outside)
    root.current?.addEventListener('keydown', escape)
    const element = root.current
    return () => { document.removeEventListener('pointerdown', outside); element?.removeEventListener('keydown', escape) }
  }, [open])
  return <div className="location-options" ref={root} onClick={event => event.stopPropagation()} onPointerDown={event => event.stopPropagation()}>
    <button ref={trigger} type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>Location options</button>
    <span className="location-options-summary">Source: {source === 'gps' ? 'GPS' : source === 'map' ? 'Map pin' : 'Demo'}</span>
    <fieldset hidden={!open} id={id} disabled={disabled} className="location-options-panel">
      <legend>Location source</legend>
      <label><input type="radio" name={`${id}-source`} checked={source === 'gps'} onChange={() => onChooseSource('gps')}/>{gpsLabel}</label>
      <label><input type="radio" name={`${id}-source`} checked={source === 'demo'} onChange={() => onChooseSource('demo')}/>Use demo location</label>
    </fieldset>
  </div>
}
