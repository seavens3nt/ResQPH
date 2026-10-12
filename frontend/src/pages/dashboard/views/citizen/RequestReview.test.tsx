import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RequestReview } from './RequestReview'
import { resolvePinnedAddress } from '../../../../features/map/InteractiveFloodMap'

vi.mock('./RequestLocationMap', () => ({ RequestLocationMap: () => null }))
vi.mock('../../../../features/map/InteractiveFloodMap', () => ({ resolvePinnedAddress: vi.fn() }))

const props = {
  coordinates: [120.9946, 14.6042] as [number, number], source: 'map' as const,
  address: 'Near the blue gate', landmark: '', headcount: '2', floodLevel: 'unknown',
  severity: 'moderate', situation: '', accessibility: '', medical: '',
}

describe('review pinned address', () => {
  beforeEach(() => vi.resetAllMocks())

  it('looks up the pin and keeps the optional note separate', async () => {
    vi.mocked(resolvePinnedAddress).mockResolvedValue('Synthetic street, Manila')
    render(<RequestReview {...props} />)
    await waitFor(() => expect(screen.getByLabelText('Reviewed pinned location')).toHaveValue('Synthetic street, Manila'))
    expect(resolvePinnedAddress).toHaveBeenCalledWith(120.9946, 14.6042)
    expect(screen.getByText('Optional address note: Near the blue gate')).toBeInTheDocument()
  })

  it('shows coordinates honestly when lookup fails', async () => {
    vi.mocked(resolvePinnedAddress).mockRejectedValue(new Error('Unavailable'))
    render(<RequestReview {...props} />)
    await screen.findByText('Address lookup unavailable. Showing the pinned coordinates.')
    expect(screen.getByLabelText('Reviewed pinned location')).toHaveValue('14.604200, 120.994600')
  })

  it('does not replace a new pin with a stale lookup', async () => {
    let finishOld!: (address: string) => void
    vi.mocked(resolvePinnedAddress)
      .mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve }))
      .mockResolvedValueOnce('New pin address')
    const { rerender } = render(<RequestReview {...props} />)
    await waitFor(() => expect(resolvePinnedAddress).toHaveBeenCalledTimes(1))
    rerender(<RequestReview {...props} coordinates={[120.995, 14.605]} />)
    await waitFor(() => expect(screen.getByLabelText('Reviewed pinned location')).toHaveValue('New pin address'))
    await act(async () => finishOld('Old pin address'))
    expect(screen.getByLabelText('Reviewed pinned location')).toHaveValue('New pin address')
  })
})
