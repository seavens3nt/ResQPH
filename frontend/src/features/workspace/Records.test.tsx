import { cleanup, render, screen } from '@testing-library/react'
import type { UseQueryResult } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'
import { QueryState } from './Records'

afterEach(cleanup)
function query(overrides: object = {}) {
  return {isLoading:false,isError:false,fetchStatus:'idle',data:undefined,refetch:vi.fn(),...overrides} as unknown as UseQueryResult<string[]>
}
const records = (items: string[]) => <p>{items.length ? items.join(', ') : 'No requests yet'}</p>
it('shows retry without fabricated records when the first load fails', () => {
  render(<QueryState query={query({isError:true,error:new Error('Unavailable')})}>{records}</QueryState>)
  expect(screen.getByRole('alert')).toBeVisible()
  expect(screen.getByRole('button',{name:'Retry'})).toBeVisible()
  expect(screen.queryByText('No requests yet')).not.toBeInTheDocument()
})
it('shows a loading placeholder before the empty result is known', () => {
  const view = render(<QueryState query={query({isLoading:true,fetchStatus:'fetching'})} layout="table">{records}</QueryState>)
  expect(screen.getByRole('status')).toHaveAttribute('aria-busy','true')
  expect(screen.queryByText('No requests yet')).not.toBeInTheDocument()
  view.rerender(<QueryState query={query({data:[]})}>{records}</QueryState>)
  expect(screen.getByText('No requests yet')).toBeVisible()
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})
it('shows an offline explanation instead of an indefinite skeleton', () => {
  render(<QueryState query={query({fetchStatus:'paused'})}>{records}</QueryState>)
  expect(screen.getByRole('status')).toHaveTextContent('You’re offline')
  expect(screen.getByRole('status')).not.toHaveAttribute('aria-busy','true')
})
it('retains loaded records during refresh and a refresh failure', () => {
  const view = render(<QueryState query={query({data:['RQ-001'],fetchStatus:'fetching'})}>{records}</QueryState>)
  expect(screen.getByText('RQ-001')).toBeVisible()
  view.rerender(<QueryState query={query({data:['RQ-001'],isError:true})}>{records}</QueryState>)
  expect(screen.getByText('RQ-001')).toBeVisible()
  expect(screen.getByRole('alert')).toHaveTextContent('Could not refresh')
  expect(screen.getByRole('button',{name:'Retry'})).toBeVisible()
})
