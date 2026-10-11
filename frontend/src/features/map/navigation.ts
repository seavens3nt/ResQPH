export interface RoutePoint { lat: number; lng: number }

const radians = Math.PI / 180
export function distance(a: RoutePoint, b: RoutePoint): number {
  return Math.hypot((b.lng - a.lng) * Math.cos((a.lat + b.lat) / 2 * radians), b.lat - a.lat) * 111_195
}

export function positionAtPathRatio(path: RoutePoint[], ratio: number): RoutePoint | null {
  if (!path.length) return null
  const lengths = path.slice(1).map((point, i) => distance(path[i], point))
  let remaining = lengths.reduce((sum, length) => sum + length, 0) * Math.max(0, Math.min(1, ratio))
  for (let i = 0; i < lengths.length; i++) {
    if (lengths[i] < 0.001) continue
    if (remaining <= lengths[i]) {
      const fraction = remaining / lengths[i]
      return { lat: path[i].lat + (path[i + 1].lat - path[i].lat) * fraction, lng: path[i].lng + (path[i + 1].lng - path[i].lng) * fraction }
    }
    remaining -= lengths[i]
  }
  return path[path.length - 1]
}

/** Derived simulated direction; short forward lookahead softens corners without a new route. */
export function routeHeading(path: RoutePoint[], ratio: number, previous = 0): number {
  const total = path.slice(1).reduce((sum, point, i) => sum + distance(path[i], point), 0)
  if (total < 0.1 || !Number.isFinite(ratio)) return previous
  const at = Math.max(0, Math.min(1, ratio))
  const look = Math.min(12 / total, 0.1)
  const a = positionAtPathRatio(path, at === 1 ? Math.max(0, at - look) : at)!
  const b = positionAtPathRatio(path, Math.min(1, at + look))!
  if (distance(a, b) < 0.01) return previous
  return (Math.atan2((b.lng - a.lng) * Math.cos((a.lat + b.lat) / 2 * radians), b.lat - a.lat) / radians + 360) % 360
}

export function smoothHeading(from: number, to: number, amount: number): number {
  const delta = ((to - from + 540) % 360) - 180
  return (from + delta * Math.max(0, Math.min(1, amount)) + 360) % 360
}
