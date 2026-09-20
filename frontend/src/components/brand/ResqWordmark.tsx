/**
 * ResQPH brand wordmark — matches the poster style:
 * bold "ResQPH" in dark red, white background, red left-border accent.
 */
interface ResqWordmarkProps {
  /** overall scale, default 1 */
  scale?: number
  className?: string
}

export function ResqWordmark({ scale = 1, className = '' }: ResqWordmarkProps) {
  const fontSize = 28 * scale
  const borderLeft = 5 * scale
  const paddingV = 6 * scale
  const paddingH = 14 * scale
  const borderRadius = 6 * scale

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: '#ffffff',
        borderRadius,
        borderLeft: `${borderLeft}px solid #b91c1c`,
        padding: `${paddingV}px ${paddingH}px`,
        boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
        lineHeight: 1,
      }}
    >
      <span
        style={{
          fontFamily: "'Montserrat', 'Outfit', 'Arial Black', sans-serif",
          fontWeight: 900,
          fontSize,
          color: '#8b0000',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          userSelect: 'none',
        }}
      >
        ResQPH
      </span>
    </div>
  )
}
