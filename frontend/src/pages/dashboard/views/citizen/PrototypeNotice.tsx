/**
 * PrototypeNotice — always-visible academic-prototype / non-production banner.
 *
 * Required by UI_STATES.md and WIREFRAMES.md: the role selector and every
 * hazard/route view must be visibly labeled as simulation or controlled data.
 * This component satisfies that requirement for the citizen request flow.
 */

interface PrototypeNoticeProps {
  /** 'form' — shown above the request form.
   *  'status' — shown on the request-status tracking view.
   *  'role' — shown near the role-simulation selector. */
  variant?: 'form' | 'status' | 'role'
  className?: string
}

export function PrototypeNotice({ variant = 'form', className }: PrototypeNoticeProps) {
  const messages: Record<NonNullable<PrototypeNoticeProps['variant']>, { heading: string; body: string }> = {
    form: {
      heading: 'Academic prototype — do not use for a real emergency',
      body: 'This form submits to a controlled demonstration workflow. Call 911 for real emergencies.',
    },
    status: {
      heading: 'Controlled scenario data only',
      body: 'Status shown is authoritative for this simulation. It does not reflect a live dispatch or guarantee any response time.',
    },
    role: {
      heading: 'Simulation only — not production authentication',
      body: 'Role selection is a prototype control and is not a secure identity service.',
    },
  }

  const { heading, body } = messages[variant]

  return (
    <div
      className={className}
      role="note"
      aria-label={heading}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.6rem',
        padding: '0.65rem 0.9rem',
        background: '#fffbeb',
        border: '1px solid #fcd34d',
        borderRadius: '6px',
        fontSize: '0.8rem',
        color: '#78350f',
      }}
    >
      {/* Icon: warning triangle — text fallback ensures color-independence */}
      <span aria-hidden="true" style={{ fontSize: '1rem', lineHeight: 1, flexShrink: 0 }}>⚠</span>
      <div>
        <strong style={{ display: 'block', marginBottom: '2px' }}>{heading}</strong>
        <span>{body}</span>
      </div>
    </div>
  )
}
