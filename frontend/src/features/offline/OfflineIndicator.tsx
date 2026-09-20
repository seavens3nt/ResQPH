import { Icon } from '../../components/art/Icon'
import { useMissions } from '../missions/MissionContext'
import './offline.css'

export function OfflineIndicator() {
  const { isOffline, pendingSyncCount, toggleOffline } = useMissions()

  if (!isOffline && pendingSyncCount === 0) return null

  return (
    <div className={`offline-bar ${isOffline ? 'is-offline' : 'is-syncing'}`}>
      <div className="offline-bar__content">
        <Icon name={isOffline ? 'wifi-off' : 'refresh'} size={18} />
        <div>
          <span className="offline-bar__title">
            {isOffline ? 'Storm Offline Mode Active' : 'Online Reconnected'}
          </span>
          <span className="offline-bar__desc">
            {isOffline
              ? `Mission & map cached on-device. ${pendingSyncCount} action(s) queued in Pending Sync.`
              : `All pending offline actions synced to central dispatch.`}
          </span>
        </div>
      </div>
      <button
        type="button"
        className="offline-bar__btn"
        onClick={toggleOffline}
      >
        {isOffline ? 'Simulate Reconnect' : 'Dismiss'}
      </button>
    </div>
  )
}
