import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RequestQueuePreview } from './RequestQueuePreview'
import type { RescueRequestRecord } from '../requests/types'

afterEach(cleanup)
const fixture = (id: string, status = 'pending', count = 1): RescueRequestRecord => ({
  id, citizen_id:'synthetic', location:{address:`Synthetic location ${id}`,point:{type:'Point',coordinates:[120.9946,14.6042]}},
  headcount:count, vulnerabilities:[],medical_needs:false,reported_flood_level:'unknown',
  status:status as RescueRequestRecord['status'],version:1,created_at:'2026-10-07T00:00:00Z',updated_at:'2026-10-07T00:00:00Z',
})
describe('Dispatcher overview request preview', () => {
  it('uses location-first rows and opens the same actual record', () => {
    const select = vi.fn(), viewAll = vi.fn()
    render(<RequestQueuePreview requests={[fixture('one'),fixture('two','assigned')]} onSelect={select} onViewAll={viewAll}/>)
    expect(screen.getByText('Synthetic location one')).toBeVisible()
    expect(screen.getByText('1 person needing assistance')).toBeVisible()
    expect(screen.queryByText('Synthetic location two')).not.toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'View request at Synthetic location one'}))
    expect(select).toHaveBeenCalledWith('one')
    fireEvent.click(screen.getByRole('button',{name:'View all 1 pending requests'}))
    expect(viewAll).toHaveBeenCalledOnce()
  })
  it('shows an informative empty queue', () => {
    render(<RequestQueuePreview requests={[]} onSelect={() => {}} onViewAll={() => {}}/>)
    expect(screen.getByText('No pending requests')).toBeVisible()
  })
})
