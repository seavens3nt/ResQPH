import type { Vulnerabilities } from '../../../../features/missions/types'

export function VulnerabilitiesBadges({ vulns }: { vulns: Vulnerabilities }) {
  const activeItems: { label: string; icon: string }[] = []
  if (vulns.infant) activeItems.push({ label: 'Infant / Child', icon: '🍼' })
  if (vulns.senior) activeItems.push({ label: 'Senior Citizen', icon: '👵' })
  if (vulns.pwd) activeItems.push({ label: 'PWD', icon: '♿' })
  if (vulns.pregnant) activeItems.push({ label: 'Pregnant', icon: '🤰' })

  if (activeItems.length === 0) {
    return <span className="vuln-none">None flagged</span>
  }

  return (
    <div className="vuln-badges-list">
      {activeItems.map((item) => (
        <span key={item.label} className="vuln-badge">
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </span>
      ))}
    </div>
  )
}
