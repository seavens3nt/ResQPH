import { describe, expect, it } from 'vitest'
import { retryAfterDelay } from './retryAfter'

describe('retryAfterDelay', () => {
  it('uses the server Retry-After seconds from normalized API errors', () => {
    expect(retryAfterDelay({ retryAfterSeconds: 17 }, 5_000)).toBe(17_000)
  })

  it('uses the supplied backoff when there is no server delay', () => {
    expect(retryAfterDelay(new Error('temporary'), 8_000)).toBe(8_000)
  })
})
