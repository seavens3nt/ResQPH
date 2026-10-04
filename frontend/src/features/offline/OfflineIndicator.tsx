import { Icon } from '../../components/art/Icon'
import { useMissions } from '../missions/MissionContext'
import './offline.css'

export function OfflineIndicator() {
  const { isOffline, pendingSyncCount, toggleOffline } = useMissions()

  if (!isOffline && pendingSyncCount === 0) return null

  const title = isOffline
    ? 'Demo offline mode is simulated'
    : 'Demo changes are awaiting verification'

  return (
    <aside
      className={`offline-bar ${isOffline ? 'is-offline' : 'has-pending'}`}
      aria-label="Offline demonstration status"
    >
      <div className="offline-bar__content">
        <Icon name={isOffline ? 'wifi-off' : 'refresh'} size={18} />
        <section role="status" aria-live="polite" className="offline-bar__message">
          <h2 className="offline-bar__title">{title}</h2>
          <p className="offline-bar__desc">
            {isOffline
              ? `This demo toggle does not change browser connectivity or confirm cached data. ${pendingSyncCount} simulated change(s) are pending; server acceptance is not confirmed.`
              : `${pendingSyncCount} simulated change(s) are awaiting verification. This indicator cannot confirm server acceptance.`}
          </p>
        </section>
      </div>
      <button
        type="button"
        className="offline-bar__btn"
        onClick={toggleOffline}
      >
        {isOffline ? 'Simulate reconnect' : 'Simulate offline mode'}
      </button>
    </aside>
  )
}
