import './LoadingState.css'

export type LoadingLayout = 'card' | 'table' | 'detail' | 'weather' | 'forecast' | 'map' | 'compact'

/** Decorative placeholders never impersonate records or expose fake values. */
export function LoadingState({label = 'Loading…', layout = 'card'}: {label?: string; layout?: LoadingLayout}) {
  const count = layout === 'forecast' ? 6 : layout === 'table' || layout === 'detail' ? 4 : 3
  return <div className={`loading-state loading-state--${layout}`} role="status" aria-live="polite" aria-busy="true">
    <span className="loading-state-label">{label}</span>
    <div className="loading-state-shapes" aria-hidden="true">
      {Array.from({length: count}, (_, index) => <div className="loading-state-row" key={index}><span/><span/><span/>{layout === 'table' && <span/>}</div>)}
    </div>
  </div>
}
