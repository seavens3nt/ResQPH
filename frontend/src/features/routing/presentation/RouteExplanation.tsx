import { useId } from 'react'
import './RouteSummary.css'

export interface RouteExplanationProps {
  explanation?: string | null
}

export function RouteExplanation({ explanation }: RouteExplanationProps) {
  const headingId = useId()
  if (!explanation) return null

  return (
    <section className="route-summary__section" aria-labelledby={headingId}>
      <h3 id={headingId}>Route explanation</h3>
      <p>The route follows eligible roads in the controlled scenario, using deterministic flood penalties and excluding impassable edges. This is not a road-safety guarantee.</p>
      <details><summary>Technical route explanation</summary><p>{explanation}</p></details>
    </section>
  )
}
