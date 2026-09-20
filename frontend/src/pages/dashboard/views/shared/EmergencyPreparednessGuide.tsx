import { Icon, type IconName } from '../../../../components/art/Icon'

const GUIDELINES = [
  {
    num: '01',
    title: 'Move to Higher Ground',
    desc: 'Move infants, senior citizens, and essential medications to the 2nd floor, attic, or roof terrace if water enters ground levels. Never delay evacuation until nightfall.',
    icon: 'pin' as IconName,
  },
  {
    num: '02',
    title: 'Shut Off Main Circuit Breaker & LPG',
    desc: 'Switch off the main electrical breaker before floodwater contacts wall outlets to prevent fatal electrocution and water contamination.',
    icon: 'warning' as IconName,
  },
  {
    num: '03',
    title: 'Signal Incoming Rescue Boats',
    desc: 'Display a bright-colored cloth, white towel, or flashlight from an upper window or balcony. Do NOT attempt to swim or wade through fast-moving waist/chest currents.',
    icon: 'shield' as IconName,
  },
  {
    num: '04',
    title: 'Keep Distress Tracking Active',
    desc: 'Keep this app open or cached on your device. Conserve battery life by lowering screen brightness; dispatchers monitor your live GPS coordinates even through storm connection drops.',
    icon: 'boat' as IconName,
  },
  {
    num: '05',
    title: 'Avoid Floodwater Contamination',
    desc: 'Do not consume tap water in flooded zones due to sewage backflow. Drink only bottled water or boiled potable water to prevent leptospirosis and waterborne infections.',
    icon: 'medical' as IconName,
  },
]

export function EmergencyPreparednessGuide() {
  return (
    <div className="preparedness-guide" role="region" aria-label="What to do during flooding">
      <div className="guide-header">
        <div className="guide-header__left">
          <Icon name="shield" size={20} />
          <h3>What To Do During Severe Flooding</h3>
        </div>
        <span className="guide-tag">Citizen Safety Protocol</span>
      </div>

      <div className="guide-grid">
        {GUIDELINES.map((guideline) => (
          <div key={guideline.num} className="guide-card">
            <div className="guide-card__top">
              <span className="guide-card__num">{guideline.num}</span>
              <Icon name={guideline.icon} size={18} />
            </div>
            <h4>{guideline.title}</h4>
            <p>{guideline.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
