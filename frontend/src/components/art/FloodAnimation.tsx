/**
 * FloodAnimation
 *
 * A layered SVG scene rendered entirely in-browser — no images, no canvas.
 * Layers (back to front):
 *   1. Sky gradient with red atmospheric glow
 *   2. Silhouette cityscape / ridge
 *   3. Rain streaks (falling diagonally)
 *   4. Water body with slow rising level
 *   5. Three animated wave bands (different speeds + amplitudes)
 *   6. Floating debris particles (circles + small rectangles)
 *   7. Red danger-glow overlay
 *
 * All motion is pure CSS keyframes injected alongside the SVG.
 * Respects prefers-reduced-motion via the global rule in index.css.
 */

import './FloodAnimation.css'

/* ── Static geometry ──────────────────────────────────────────────── */

/** City silhouette polygon points */
const CITY_OUTLINE =
  '0,340 0,290 30,290 30,240 60,240 60,200 90,200 90,180 120,180 ' +
  '120,220 150,220 150,160 180,160 180,140 210,140 210,170 240,170 ' +
  '240,130 260,130 260,110 280,110 280,150 310,150 310,120 340,120 ' +
  '340,160 360,160 360,130 390,130 390,170 420,170 420,140 450,140 ' +
  '450,180 480,180 480,200 510,200 510,220 540,220 540,190 570,190 ' +
  '570,210 600,210 600,230 630,230 630,260 660,260 660,290 690,290 ' +
  '690,310 720,310 720,290 750,290 750,260 780,260 780,240 800,240 ' +
  '800,340'

/** Rain streak coordinates [x1, y1, x2, y2][] */
const RAIN_LINES: [number, number, number, number][] = Array.from(
  { length: 60 },
  (_, i) => {
    const x = (i * 137.5) % 800
    const y = ((i * 53) % 260) - 20
    return [x, y, x - 12, y + 30]
  },
)

/** Debris items: type, initial x, y, size, animation delay */
interface Debris {
  id: number
  type: 'circle' | 'rect'
  x: number
  y: number
  size: number
  delay: number
  speed: number /* animation duration in seconds */
}

const DEBRIS: Debris[] = [
  { id: 0,  type: 'circle', x: 60,  y: 318, size: 5,  delay: 0.0, speed: 9  },
  { id: 1,  type: 'rect',   x: 140, y: 312, size: 8,  delay: 1.2, speed: 11 },
  { id: 2,  type: 'circle', x: 230, y: 322, size: 4,  delay: 0.4, speed: 8  },
  { id: 3,  type: 'rect',   x: 310, y: 308, size: 10, delay: 2.1, speed: 13 },
  { id: 4,  type: 'circle', x: 390, y: 316, size: 6,  delay: 0.8, speed: 10 },
  { id: 5,  type: 'rect',   x: 470, y: 320, size: 7,  delay: 1.6, speed: 9  },
  { id: 6,  type: 'circle', x: 550, y: 314, size: 5,  delay: 0.2, speed: 12 },
  { id: 7,  type: 'rect',   x: 630, y: 318, size: 9,  delay: 1.9, speed: 8  },
  { id: 8,  type: 'circle', x: 710, y: 310, size: 4,  delay: 0.6, speed: 11 },
  { id: 9,  type: 'rect',   x: 770, y: 322, size: 6,  delay: 2.4, speed: 10 },
]

/* ── Component ────────────────────────────────────────────────────── */

export function FloodAnimation() {
  return (
    <div className="flood-wrap" aria-hidden="true">
      <svg
        className="flood-svg"
        viewBox="0 0 800 380"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Sky gradient */}
          <linearGradient id="fa-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#1a0505" />
            <stop offset="40%"  stopColor="#2d0a0a" />
            <stop offset="100%" stopColor="#0e0303" />
          </linearGradient>

          {/* Water gradient — dark red at top fading deeper */}
          <linearGradient id="fa-water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#8b1a1a" stopOpacity="0.9" />
            <stop offset="40%"  stopColor="#5a0e0e" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#1a0404" stopOpacity="1" />
          </linearGradient>

          {/* Wave front gradients */}
          <linearGradient id="fa-wave-a" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#c41a1a" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#8b1a1a" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="fa-wave-b" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#a01414" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#6b0e0e" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="fa-wave-c" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#d62828" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#a01414" stopOpacity="0.7" />
          </linearGradient>

          {/* Red atmospheric glow at bottom */}
          <radialGradient id="fa-glow" cx="50%" cy="100%" r="70%">
            <stop offset="0%"  stopColor="#d62828" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#d62828" stopOpacity="0" />
          </radialGradient>

          {/* Clip paths */}
          <clipPath id="fa-view">
            <rect width="800" height="380" />
          </clipPath>
        </defs>

        <g clipPath="url(#fa-view)">

          {/* ── 1. Sky ─────────────────────────────────────────────── */}
          <rect width="800" height="380" fill="url(#fa-sky)" />

          {/* ── 2. Atmospheric red glow bands ─────────────────────── */}
          <ellipse
            cx="680" cy="60" rx="280" ry="140"
            fill="#c41010" fillOpacity="0.18"
            className="flood-glow-pulse"
          />
          <ellipse
            cx="120" cy="90" rx="200" ry="100"
            fill="#a00a0a" fillOpacity="0.12"
            className="flood-glow-pulse flood-glow-pulse--offset"
          />

          {/* ── 3. Rain streaks ────────────────────────────────────── */}
          <g
            stroke="rgba(255,180,180,0.18)"
            strokeWidth="0.8"
            className="flood-rain"
          >
            {RAIN_LINES.map(([x1, y1, x2, y2], i) => (
              <line
                key={i}
                x1={x1} y1={y1}
                x2={x2} y2={y2}
                style={{ animationDelay: `${(i * 0.083) % 1.8}s` }}
                className="flood-rain__streak"
              />
            ))}
          </g>

          {/* ── 4. City silhouette ─────────────────────────────────── */}
          <polygon
            points={CITY_OUTLINE}
            fill="#0a0202"
            fillOpacity="0.92"
          />
          {/* Window lights */}
          {[
            [95, 190], [97, 200], [165, 168], [165, 178],
            [253, 140], [253, 152], [318, 130], [318, 142],
            [373, 140], [455, 150], [455, 162], [520, 207],
            [580, 196], [645, 268], [700, 296],
          ].map(([cx, cy], i) => (
            <rect
              key={i}
              x={cx} y={cy}
              width={4} height={5}
              fill="#ff6b6b"
              fillOpacity="0.7"
              className="flood-window"
              style={{ animationDelay: `${(i * 0.37) % 3}s` }}
            />
          ))}

          {/* ── 5. Rising water body ───────────────────────────────── */}
          <rect
            x="0" y="280" width="800" height="100"
            fill="url(#fa-water)"
            className="flood-water-rise"
          />

          {/* ── 6. Wave band C (back, slowest) ────────────────────── */}
          <path
            fill="url(#fa-wave-b)"
            className="flood-wave flood-wave--c"
            d="
              M-200 295
              C-130 282, -60 308, 0 295
              S130 272, 200 295
              S330 308, 400 295
              S530 272, 600 295
              S730 308, 800 295
              S930 272, 1000 295
              L1000 380 L-200 380 Z"
          />

          {/* ── 7. Wave band B (mid) ───────────────────────────────── */}
          <path
            fill="url(#fa-wave-a)"
            className="flood-wave flood-wave--b"
            d="
              M-200 302
              C-120 288, -40 316, 0 302
              S140 278, 200 302
              S340 316, 400 302
              S540 278, 600 302
              S740 316, 800 302
              S940 278, 1000 302
              L1000 380 L-200 380 Z"
          />

          {/* ── 8. Wave band A (front, fastest) ───────────────────── */}
          <path
            fill="url(#fa-wave-c)"
            className="flood-wave flood-wave--a"
            d="
              M-200 310
              C-100 294, -20 324, 0 310
              S140 284, 200 310
              S340 324, 400 310
              S540 284, 600 310
              S740 324, 800 310
              S940 284, 1000 310
              L1000 380 L-200 380 Z"
          />

          {/* ── 9. Wave surface shimmer line ──────────────────────── */}
          <path
            fill="none"
            stroke="rgba(255,100,100,0.35)"
            strokeWidth="1.5"
            className="flood-shimmer"
            d="
              M-200 308
              C-100 296, -20 318, 100 308
              S300 296, 400 308
              S600 296, 700 308
              S900 296, 1000 308"
          />

          {/* ── 10. Debris ────────────────────────────────────────── */}
          {DEBRIS.map((d) =>
            d.type === 'circle' ? (
              <circle
                key={d.id}
                cx={d.x}
                cy={d.y}
                r={d.size}
                fill="#8b1a1a"
                fillOpacity="0.75"
                className="flood-debris"
                style={{
                  animationDelay: `${d.delay}s`,
                  animationDuration: `${d.speed}s`,
                }}
              />
            ) : (
              <rect
                key={d.id}
                x={d.x - d.size / 2}
                y={d.y - d.size / 4}
                width={d.size * 2}
                height={d.size * 0.6}
                rx={1}
                fill="#6b1010"
                fillOpacity="0.7"
                className="flood-debris"
                style={{
                  animationDelay: `${d.delay}s`,
                  animationDuration: `${d.speed}s`,
                }}
              />
            ),
          )}

          {/* ── 11. Ripple rings on water surface ─────────────────── */}
          {[120, 320, 540, 720].map((cx, i) => (
            <ellipse
              key={cx}
              cx={cx}
              cy={315}
              rx={18}
              ry={5}
              fill="none"
              stroke="rgba(255,100,100,0.25)"
              strokeWidth="1"
              className="flood-ripple"
              style={{ animationDelay: `${i * 0.7}s` }}
            />
          ))}

          {/* ── 12. Bottom red glow overlay ───────────────────────── */}
          <rect
            width="800" height="380"
            fill="url(#fa-glow)"
          />

          {/* ── 13. Vignette ──────────────────────────────────────── */}
          <radialGradient id="fa-vignette" cx="50%" cy="50%" r="70%">
            <stop offset="60%"  stopColor="transparent" />
            <stop offset="100%" stopColor="#120808" stopOpacity="0.7" />
          </radialGradient>
          <rect width="800" height="380" fill="url(#fa-vignette)" />

        </g>
      </svg>
    </div>
  )
}
