import { cleanup,fireEvent,render,screen,within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach,beforeEach,expect,it,vi } from 'vitest'
import { CitizenWorkspace } from './CitizenWorkspace'

const state=vi.hoisted(()=>({status:'pending',refetch:vi.fn(),cancel:vi.fn()}))
vi.mock('./CitizenMap',()=>({CitizenMap:({onSelect,onCancel,cancelError}: {onSelect:(id:string)=>void;onCancel:()=>void;cancelError?:string})=><><button onClick={()=>onSelect('stored-request-001')}>Select pending request</button><button onClick={onCancel}>Cancel map request</button>{cancelError && <p role="alert">{cancelError}</p>}</>}))
vi.mock('../requests/hooks',()=>({
  useMyRescueRequests:()=>({isLoading:false,isError:false,data:{items:[{id:'stored-request-001',status:state.status,version:3,location:{address:'Synthetic address'},headcount:2}],total:1},refetch:state.refetch}),
  useRescueRequest:()=>({isLoading:false,isError:false,isFetching:false,refetch:state.refetch,data:{id:'stored-request-001',status:state.status,version:3,location:{address:'Synthetic address'},headcount:2,reported_flood_level:'unknown',situation_summary:null,vulnerabilities:[],medical_needs:false}}),
  useCancelRescueRequest:()=>({mutate:state.cancel,isPending:false}),
  useCreateRescueRequest:()=>({mutate:vi.fn(),isPending:false}),
}))
afterEach(cleanup)
beforeEach(()=>{state.status='pending';vi.clearAllMocks()})
function preview(section='inquiries') {render(<MemoryRouter initialEntries={[`/dashboard?view=${section}`]}><CitizenWorkspace section={section}/></MemoryRouter>)}
it('opens selected status in a modal, keeps the list, refreshes, and restores focus on Escape',()=>{
  preview()
  const trigger=screen.getByRole('button',{name:'View RQ-001'})
  trigger.focus();fireEvent.click(trigger)
  const dialog=screen.getByRole('dialog',{name:'Request status'})
  expect(screen.getByRole('table')).toBeVisible()
  expect(within(dialog).getByText('People needing help')).toBeVisible()
  expect(within(dialog).getAllByText('None reported',{exact:true})).toHaveLength(3)
  expect(within(dialog).queryByText('Location and recorded history')).not.toBeInTheDocument()
  expect(within(dialog).getByRole('progressbar')).toHaveAttribute('aria-valuenow','1')
  expect(dialog.querySelector('.status-popup-track>span')).toHaveStyle({width:'10%'})
  expect(within(dialog).getByRole('button',{name:'Close dialog'})).toHaveFocus()
  fireEvent.click(within(dialog).getByRole('button',{name:'Refresh request status'}))
  expect(state.refetch).toHaveBeenCalledOnce()
  fireEvent.keyDown(window,{key:'Escape'})
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(trigger).toHaveFocus()
})
it('cancels directly with the request version and no confirmation dialog',()=>{
  preview();fireEvent.click(screen.getByRole('button',{name:'View RQ-001'}))
  fireEvent.click(screen.getByRole('button',{name:'Cancel Request'}))
  expect(screen.queryByRole('dialog',{name:'Cancel request confirmation'})).not.toBeInTheDocument()
  expect(screen.getByRole('dialog',{name:'Request status'})).toBeVisible()
  expect(state.cancel).toHaveBeenCalledWith({requestId:'stored-request-001',payload:{reason:'Citizen cancelled via prototype UI',version:3}},expect.any(Object))
})
it('cancels directly from the map without opening another popup',()=>{
  preview('map');fireEvent.click(screen.getByRole('button',{name:'Select pending request'}))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button',{name:'Cancel map request'}))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(state.cancel).toHaveBeenCalledWith({requestId:'stored-request-001',payload:{reason:'Citizen cancelled via prototype UI',version:3}},expect.any(Object))
})
it('closes tracking only after cancellation succeeds and shows a distinct dashboard notice',()=>{
  state.cancel.mockImplementationOnce((_input,options)=>options.onSuccess())
  preview();fireEvent.click(screen.getByRole('button',{name:'View RQ-001'}))
  fireEvent.click(screen.getByRole('button',{name:'Cancel Request'}))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent('Request cancelled')
  expect(screen.getByRole('status')).toHaveClass('request-cancelled-notice')
  expect(screen.getByRole('table')).toBeVisible()
})
it('keeps tracking open and does not show a success notice when cancellation fails',()=>{
  state.cancel.mockImplementationOnce((_input,options)=>options.onError(new Error('Offline')))
  preview();fireEvent.click(screen.getByRole('button',{name:'View RQ-001'}))
  fireEvent.click(screen.getByRole('button',{name:'Cancel Request'}))
  expect(screen.getByRole('dialog',{name:'Request status'})).toBeVisible()
  expect(screen.getByRole('alert')).toHaveTextContent('Cancellation failed')
  expect(screen.queryByText('Request cancelled')).not.toBeInTheDocument()
})
it('shows a map cancellation conflict inline and refreshes authoritative data',()=>{
  state.cancel.mockImplementationOnce((_input,options)=>options.onError({response:{status:409}}))
  preview('map');fireEvent.click(screen.getByRole('button',{name:'Select pending request'}))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button',{name:'Cancel map request'}))
  expect(screen.getByRole('alert')).toHaveTextContent('Conflict: the request state changed')
  expect(state.refetch).toHaveBeenCalledOnce()
})
it.each(['assigned','en-route','arrived','completed','cancelled'])('preserves %s without offering invalid cancellation',status=>{
  state.status=status;preview();fireEvent.click(screen.getByRole('button',{name:'All'}));fireEvent.click(screen.getByRole('button',{name:'View RQ-001'}))
  const dialog=screen.getByRole('dialog',{name:'Request status'})
  expect(within(dialog).queryByRole('button',{name:'Cancel Request'})).not.toBeInTheDocument()
  if(status==='cancelled') expect(within(dialog).getByRole('status')).toHaveTextContent('Request cancelled')
  else {
    expect(dialog.querySelector('[aria-current="step"]')).toHaveTextContent(status==='assigned'?'Team assigned':status==='en-route'?'En route':status==='arrived'?'Arrived at location':'Completed')
    const index=['pending','assigned','en-route','arrived','completed'].indexOf(status)
    expect(dialog.querySelectorAll('.status-popup-progress .is-reached')).toHaveLength(index+1)
    expect(dialog.querySelector('.status-popup-track>span')).toHaveStyle({width:`${status==='completed'?100:(index+.5)/5*100}%`})
  }
})
