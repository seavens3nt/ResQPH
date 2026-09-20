import type { ReactNode } from 'react'

interface SectionProps {
  title: string
  subtitle?: string
  children: ReactNode
  action?: ReactNode
}

export function Section({ title, subtitle, children, action }: SectionProps) {
  return (
    <section className="dash-section">
      <div className="dash-section__head">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
