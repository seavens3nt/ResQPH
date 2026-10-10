import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { CitizenDraftProvider } from './CitizenDraft'
import { useCitizenDraft } from './CitizenDraftContext'
import { RequestForm } from '../../pages/dashboard/views/citizen/RequestForm'

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }))
vi.mock('../requests/hooks', () => ({ useCreateRescueRequest: () => ({mutate, isPending:false}) }))
vi.mock('../../pages/dashboard/views/citizen/RequestLocationMap', () => ({RequestLocationMap: ({onChooseCoordinates}:{onChooseCoordinates:(value:[number,number])=>void}) => <div>Location map<button type="button" onClick={()=>onChooseCoordinates([181,14.6042])}>Choose invalid map location</button></div>}))
afterEach(cleanup)
beforeEach(() => { mutate.mockReset() })

function DraftHarness() {
  const [editing, setEditing] = useState(true)
  const context = useCitizenDraft()!
  return <><button onClick={() => setEditing(!editing)}>Navigate away or back</button>
    <button onClick={() => {context.saveDraft(null);setEditing(false)}}>Discard draft</button>
    {editing ? <RequestForm requireReview onCancel={() => setEditing(false)} onSuccess={() => setEditing(false)}/> : <p>Other workspace page</p>}
  </>
}

describe('Citizen form hardening', () => {
  it('shows and focuses validation for invalid map-provided coordinates without manual inputs', async () => {
    render(<RequestForm requireReview onCancel={() => {}} onSuccess={() => {}}/>)
    fireEvent.click(screen.getByRole('button',{name:'Choose invalid map location'}))
    fireEvent.change(screen.getByLabelText(/Location — street address/),{target:{value:'Synthetic invalid map address'}})
    fireEvent.click(screen.getByRole('button', {name:'Review request'}))
    const input = document.querySelector<HTMLElement>('[aria-invalid="true"]')!
    await waitFor(() => expect(input).toHaveFocus())
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByLabelText('Longitude')).not.toBeInTheDocument()
    expect(screen.getByText('Check your request before continuing')).toBeVisible()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('keeps a tab-local draft through unmount and only discards explicitly', async () => {
    render(<CitizenDraftProvider><DraftHarness/></CitizenDraftProvider>)
    fireEvent.change(screen.getByLabelText(/Location — street address/), {target:{value:'Synthetic saved address'}})
    fireEvent.change(screen.getByLabelText(/People needing assistance/), {target:{value:'3'}})
    fireEvent.click(screen.getByRole('button', {name:'Navigate away or back'}))
    fireEvent.click(screen.getByRole('button', {name:'Navigate away or back'}))
    expect(screen.getByLabelText(/Location — street address/)).toHaveValue('Synthetic saved address')
    expect(screen.getByLabelText(/People needing assistance/)).toHaveValue(3)
    fireEvent.click(screen.getByRole('button', {name:'Discard draft'}))
    fireEvent.click(screen.getByRole('button', {name:'Navigate away or back'}))
    expect(screen.getByLabelText(/Location — street address/)).not.toHaveValue('Synthetic saved address')
    expect(sessionStorage.length).toBe(0)
  })

  it('reports service failure without leaking raw errors or losing details', async () => {
    mutate.mockImplementation((_input, callbacks) => callbacks.onError(new Error('internal socket/path detail')))
    render(<RequestForm requireReview onCancel={() => {}} onSuccess={() => {}}/>)
    fireEvent.change(screen.getByLabelText(/Location — street address/), {target:{value:'Synthetic retry address'}})
    fireEvent.click(screen.getByRole('button', {name:'Review request'}))
    fireEvent.click(screen.getByRole('button', {name:'Submit Request'}))
    expect(await screen.findByTestId('submit-error-banner')).toHaveTextContent('Could not reach the request service')
    expect(screen.queryByText('internal socket/path detail')).not.toBeInTheDocument()
    expect(screen.getByLabelText(/Location — street address/)).toHaveValue('Synthetic retry address')
  })
})
