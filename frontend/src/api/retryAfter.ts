import { isAxiosError } from 'axios'

/** Return the server's Retry-After delay, or the supplied bounded backoff. */
export function retryAfterDelay(error: unknown, fallbackMs: number): number {
  if (typeof error === 'object' && error !== null && 'retryAfterSeconds' in error) {
    const seconds = (error as { retryAfterSeconds?: unknown }).retryAfterSeconds
    if (typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0) return seconds * 1000
  }
  if (isAxiosError(error)) {
    const value = error.response?.headers?.['retry-after']
    const seconds = typeof value === 'string' ? Number(value) : Number.NaN
    if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000
    if (typeof value === 'string') {
      const dateDelay = Date.parse(value) - Date.now()
      if (Number.isFinite(dateDelay) && dateDelay > 0) return dateDelay
    }
  }
  return fallbackMs
}
