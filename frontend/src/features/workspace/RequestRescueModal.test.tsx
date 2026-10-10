import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { CitizenWorkspace } from './CitizenWorkspace'
import { CitizenDraftProvider } from './CitizenDraft'

const { mutate } = vi.hoisted(() => ({mutate:vi.fn()}))
vi.mock('../requests/hooks', () => ({
  useMyRescueRequests: () => ({isLoading:false,isError:false,data:{items:[],total:0},refetch:vi.fn()}),
  useCreateRescueRequest: () => ({mutate,isPending:false}),
  useCancelRescueRequest: () => ({mutate:vi.fn(),isPending:false}),
}))
vi.mock('../../pages/dashboard/views/citizen/RequestLocationMap', () => ({RequestLocationMap: ({onConfirmLocation}:{onConfirmLocation:()=>void}) => <div>Location map<button type="button" onClick={onConfirmLocation}>Use this rescue location</button></div>}))
vi.mock('./useUbeltWeather', () => ({
  useUbeltWeather: () => ({isError:true,isFetching:false}),
  useUbeltHourlyWeather: () => ({isError:true,fetchStatus:'idle'}),
}))
function Location() { return <output aria-label="Current route">{useLocation().search}</output> }
function renderWorkspace() {
  render(<MemoryRouter initialEntries={['/dashboard?view=overview']}><CitizenDraftProvider><CitizenWorkspace section="overview"/><Location/></CitizenDraftProvider></MemoryRouter>)
}
afterEach(cleanup)
beforeEach(()=>mutate.mockReset())

it('opens on the dashboard, traps focus, ignores backdrop clicks, and retains the draft on Escape', () => {
  renderWorkspace()
  const trigger = screen.getByRole('button',{name:'Request rescue'})
  trigger.focus()
  fireEvent.click(trigger)
  const dialog = screen.getByRole('dialog',{name:'Where is help needed?'})
  const close = within(dialog).getByRole('button',{name:'Close dialog'})
  expect(close).toHaveFocus()
  expect(screen.getByLabelText('Current route')).toHaveTextContent('?view=overview')
  fireEvent.change(screen.getByLabelText(/Optional address or location description/),{target:{value:'Synthetic retained address'}})
  expect(screen.queryByRole('region',{name:'Unsubmitted request draft'})).not.toBeInTheDocument()
  fireEvent.click(dialog.parentElement!)
  expect(dialog).toBeInTheDocument()
  within(dialog).getByRole('button',{name:'Review request'}).focus()
  fireEvent.keyDown(window,{key:'Tab'})
  expect(close).toHaveFocus()
  fireEvent.keyDown(window,{key:'Escape'})
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(trigger).toHaveFocus()
  expect(screen.getByRole('region',{name:'Unsubmitted request draft'})).toBeVisible()
  expect(mutate).not.toHaveBeenCalled()
  fireEvent.click(trigger)
  expect(screen.queryByRole('region',{name:'Unsubmitted request draft'})).not.toBeInTheDocument()
  expect(screen.getByLabelText(/Optional address or location description/)).toHaveValue('Synthetic retained address')
  fireEvent.click(screen.getByRole('button',{name:'Cancel'}))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(trigger).toHaveFocus()
})

it('does not show an unfinished-request notice when an untouched form is closed', () => {
  renderWorkspace()
  fireEvent.click(screen.getByRole('button',{name:'Request rescue'}))
  fireEvent.click(screen.getByRole('button',{name:'Cancel'}))
  expect(screen.queryByRole('region',{name:'Unsubmitted request draft'})).not.toBeInTheDocument()
})

it('resumes the draft and discards it directly without extra confirmation', () => {
  renderWorkspace()
  fireEvent.click(screen.getByRole('button',{name:'Request rescue'}))
  fireEvent.change(screen.getByLabelText(/People needing assistance/),{target:{value:'3'}})
  fireEvent.click(screen.getByRole('button',{name:'Cancel'}))
  fireEvent.click(screen.getByRole('button',{name:'Resume draft'}))
  expect(screen.getByLabelText(/People needing assistance/)).toHaveValue(3)
  fireEvent.click(screen.getByRole('button',{name:'Cancel'}))
  fireEvent.click(screen.getByRole('button',{name:'Discard draft'}))
  expect(screen.queryByText('Discard the unsent details? This cannot be undone.')).not.toBeInTheDocument()
  expect(screen.queryByRole('button',{name:'Keep draft'})).not.toBeInTheDocument()
  expect(screen.queryByRole('region',{name:'Unsubmitted request draft'})).not.toBeInTheDocument()
})

it('validates and reviews without submission, supports editing, and uses the existing payload on final submit', () => {
  renderWorkspace()
  fireEvent.click(screen.getByRole('button',{name:'Request rescue'}))
  fireEvent.change(screen.getByLabelText(/People needing assistance/),{target:{value:'0'}})
  fireEvent.click(screen.getByRole('button',{name:'Review request'}))
  expect(screen.getByText('Check your request before continuing')).toBeVisible()
  expect(mutate).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText(/People needing assistance/),{target:{value:'2'}})
  fireEvent.click(screen.getByRole('button',{name:'Use this rescue location'}))
  fireEvent.click(screen.getByRole('button',{name:'Review request'}))
  expect(screen.getByRole('heading',{name:'Review rescue request'})).toHaveFocus()
  expect(mutate).not.toHaveBeenCalled()
  expect(screen.getByLabelText('Reviewed pinned location')).toHaveValue('Pinned location')
  expect(within(screen.getByRole('region',{name:'Request summary'})).getAllByRole('term')).toHaveLength(7)
  expect(screen.getByText(/Confirmed rescue pin/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button',{name:'Back'}))
  expect(screen.getByLabelText(/People needing assistance/)).toHaveValue(2)
  fireEvent.click(screen.getByRole('button',{name:'Review request'}))
  fireEvent.click(screen.getByRole('button',{name:'Submit Request'}))
  expect(mutate).toHaveBeenCalledOnce()
  expect(mutate.mock.calls[0][0]).toMatchObject({headcount:2,location:{point:{coordinates:[120.9946,14.6042]}},reported_flood_level:'unknown'})
  expect(screen.getByLabelText('Current route')).toHaveTextContent('?view=overview')
})

it('shows the temporary success notice only after server confirmation, without opening tracking over it', () => {
  renderWorkspace()
  fireEvent.click(screen.getByRole('button',{name:'Request rescue'}))
  fireEvent.click(screen.getByRole('button',{name:'Use this rescue location'}))
  fireEvent.click(screen.getByRole('button',{name:'Review request'}))
  fireEvent.click(screen.getByRole('button',{name:'Submit Request'}))
  expect(screen.queryByText('Your request has successfully been submitted!')).not.toBeInTheDocument()
  act(()=>mutate.mock.calls[0][1].onSuccess({id:'request-synthetic-success'}))
  expect(screen.getByText('Your request has successfully been submitted!')).toHaveAttribute('role','status')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByLabelText('Current route')).toHaveTextContent('?view=inquiries')
})
