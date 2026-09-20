/**
 * ResQPH logo — faithful SVG recreation of the official mark.
 * No background fill — transparent, works on any color.
 * Circular emblem: rescuer reaching person over flood waves + "resqph" wordmark.
 */
interface ResqLogoProps {
  size?: number
  /** show just the circular icon, no wordmark below */
  iconOnly?: boolean
  className?: string
}

export function ResqLogo({ size = 100, iconOnly = false, className = '' }: ResqLogoProps) {
  // viewBox is 100 wide × 140 tall (icon + wordmark), or 100×100 icon only
  const vbHeight = iconOnly ? 100 : 142

  return (
    <svg
      width={size}
      height={iconOnly ? size : Math.round(size * 1.42)}
      viewBox={`0 0 100 ${vbHeight}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="ResQPH"
    >
      {/* ════════════════════════════════
          CIRCLE OUTLINE — open arc
          (gap at top-right, ~30° open)
          ════════════════════════════════ */}
      <path
        d="M 72 6 A 46 46 0 1 0 94 30"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
      />

      {/* ════════════════════════════════
          MOTION / SPEED LINES (left)
          ════════════════════════════════ */}
      <path d="M 12 40 Q 20 38.5 25 41" stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M 10 48 Q 19 46.5 24 49" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M 12 56 Q 20 54.5 25 57" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" />

      {/* ════════════════════════════════
          RESCUER FIGURE
          ════════════════════════════════ */}
      {/* Head */}
      <circle cx="41" cy="20" r="5.2" fill="white" />

      {/* Torso — leaning far forward */}
      <path
        d="M 41 25 C 40 31 37 37 33 45"
        stroke="white" strokeWidth="3.8" strokeLinecap="round" fill="none"
      />

      {/* Reaching arm — sweeping right toward rescued person */}
      <path
        d="M 39 30 C 50 24 60 21 68 20"
        stroke="white" strokeWidth="3.2" strokeLinecap="round" fill="none"
      />

      {/* Trailing arm — behind body */}
      <path
        d="M 39 32 C 34 37 30 39 27 40"
        stroke="white" strokeWidth="2.6" strokeLinecap="round" fill="none"
      />

      {/* Front leg — striding forward and down */}
      <path
        d="M 33 45 C 30 54 26 62 23 68"
        stroke="white" strokeWidth="3.2" strokeLinecap="round" fill="none"
      />

      {/* Back leg — kicked up behind */}
      <path
        d="M 33 45 C 37 52 42 58 46 64"
        stroke="white" strokeWidth="3.2" strokeLinecap="round" fill="none"
      />

      {/* ════════════════════════════════
          RESCUED PERSON (smaller, upper right)
          ════════════════════════════════ */}
      {/* Head */}
      <circle cx="72" cy="18" r="4" fill="white" />

      {/* Body */}
      <path
        d="M 72 22 C 71 27 69 32 67 37"
        stroke="white" strokeWidth="2.8" strokeLinecap="round" fill="none"
      />

      {/* Arm toward rescuer */}
      <path
        d="M 71 25 C 68 23 65 21 62 20"
        stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none"
      />

      {/* Other arm out */}
      <path
        d="M 72 25 C 76 23 79 21 81 20"
        stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none"
      />

      {/* Legs */}
      <path
        d="M 67 37 C 64 44 62 50 60 55"
        stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"
      />
      <path
        d="M 67 37 C 70 44 72 50 74 55"
        stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"
      />

      {/* ════════════════════════════════
          FLOOD WAVES
          Multiple layered wave shapes
          ════════════════════════════════ */}
      {/* Large main wave — cresting right */}
      <path
        d="M 14 70
           C 20 63 30 63 36 70
           C 42 77 50 62 58 60
           C 63 58 68 61 72 65
           L 74 70
           C 70 66 64 63 58 66
           C 50 70 42 84 34 76
           C 28 70 20 70 14 76
           Z"
        fill="white"
      />

      {/* Mid wave */}
      <path
        d="M 10 78
           C 18 72 28 72 34 78
           C 40 84 50 72 58 70
           C 63 68 68 71 72 75
           L 72 80
           C 68 76 63 74 57 76
           C 48 80 40 90 32 84
           C 26 79 17 79 10 84
           Z"
        fill="white"
        opacity="0.8"
      />

      {/* Bottom wave */}
      <path
        d="M 12 86
           C 20 81 30 81 36 86
           C 42 91 52 82 60 80
           L 60 86
           C 52 88 42 96 34 91
           C 28 87 19 87 12 91
           Z"
        fill="white"
        opacity="0.55"
      />

      {/* ════════════════════════════════
          WORDMARK — resqph
          "resq" white | "p" blue | "h" red
          ════════════════════════════════ */}
      {!iconOnly && (
        <text
          x="50"
          y="132"
          textAnchor="middle"
          fontFamily="'Montserrat', 'Outfit', 'Arial Black', sans-serif"
          fontWeight="800"
          fontSize="20"
          letterSpacing="1"
        >
          <tspan fill="white">resq</tspan><tspan fill="#3b6de8">p</tspan><tspan fill="#e11d1d">h</tspan>
        </text>
      )}
    </svg>
  )
}
