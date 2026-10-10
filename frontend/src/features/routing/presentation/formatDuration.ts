export function formatDuration(seconds: number) {
  const rounded = Math.round(seconds)
  const minutes = Math.floor(rounded / 60)
  const remainingSeconds = rounded % 60
  if (minutes === 0) return `${rounded} sec`
  if (remainingSeconds === 0) return `${minutes} min`
  return `${minutes} min ${remainingSeconds} sec`
}
