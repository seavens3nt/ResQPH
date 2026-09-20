interface ResqShieldLogoProps {
  size?: number
  className?: string
  monochrome?: boolean
}
export function ResqShieldLogo({ size = 80, className = '', monochrome = false }: ResqShieldLogoProps) {
  const height = Math.round(size * 1.18)
  const red = monochrome ? '#ffffff' : '#D62828'
  const innerRed = monochrome ? 'rgba(255,255,255,0.85)' : '#b91c1c'

  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 100 118"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="ResQPH Shield Logo"
    >
      <defs>
        <filter id="shield-glow" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={red} floodOpacity="0.5" />
        </filter>
        <linearGradient id="shield-fill" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor={red} />
          <stop offset="100%" stopColor={innerRed} />
        </linearGradient>
      </defs>

      {/* Shield body */}
      <path
        d="M50 6 C36 6 20 11 14 18 L14 58 C14 82 34 100 50 110 C66 100 86 82 86 58 L86 18 C80 11 64 6 50 6 Z"
        fill="url(#shield-fill)"
        filter="url(#shield-glow)"
      />

      {/* White shield border (inner stroke effect) */}
      <path
        d="M50 13 C38 13 24 17 18 23 L18 58 C18 79 36 96 50 105 C64 96 82 79 82 58 L82 23 C76 17 62 13 50 13 Z"
        fill="none"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1.5"
      />

      {/* Emergency Cross — horizontal bar */}
      <rect x="33" y="49" width="34" height="10" rx="4" fill="#ffffff" />

      {/* Emergency Cross — vertical bar */}
      <rect x="45" y="37" width="10" height="34" rx="4" fill="#ffffff" />
    </svg>
  )
}
