import { useId } from 'react'
import type { RouteCostBreakdown as RouteCostBreakdownData } from '../types'
import './RouteSummary.css'

export interface RouteCostBreakdownProps {
  breakdown?: Partial<RouteCostBreakdownData>
  totalCost?: number
}

function formatCost(value: number) {
  return `${new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(value)} cost units`
}

export function RouteCostBreakdown({ breakdown, totalCost }: RouteCostBreakdownProps) {
  const headingId = useId()
  const entries: readonly (readonly [string, number | undefined])[] = [
    ['Base cost', breakdown?.base],
    ['Deterministic risk contribution', breakdown?.deterministic_risk],
    ['ML contribution', breakdown?.ml_risk],
  ] as const
  const suppliedEntries = entries.filter(
    (entry): entry is readonly [string, number] => entry[1] !== undefined,
  )

  if (suppliedEntries.length === 0 && totalCost === undefined) return null

  return (
    <section className="route-summary__section" aria-labelledby={headingId}>
      <h3 id={headingId}>Cost breakdown</h3>
      <dl className="route-summary__costs">
        {totalCost !== undefined && (
          <div>
            <dt>Total cost</dt>
            <dd>{formatCost(totalCost)}</dd>
          </div>
        )}
        {suppliedEntries.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{formatCost(value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
