import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { CitizenMap } from './CitizenMap'
const {refetch,detailRefetch} = vi.hoisted(()=>({refetch:vi.fn(),detailRefetch:vi.fn()}))
vi.mock('../requests/hooks',()=>({useRescueRequest:(id:string)=>({isLoading:false,isError:false,isFetching:false,refetch:detailRefetch,data:id?{id,status:id==='stored-cancelled'?'cancelled':id==='stored-assigned'?'assigned':'pending',headcount:2,reported_flood_level:'unknown',situation_summary:null,vulnerabilities:[],medical_needs:false}:undefined}),useMyRescueRequests:()=>({isLoading:false,isError:false,isFetching:false,refetch,data:{items:[
  {id:'stored-pending',status:'pending',headcount:2,location:{address:'Synthetic address',point:{coordinates:[120.9946,14.6042]}}},
  {id:'stored-assigned',status:'assigned',headcount:1,location:{address:'Other synthetic address',point:null}},
  {id:'stored-cancelled',status:'cancelled',headcount:2,location:{address:'Cancelled synthetic address',point:null}},
]}})}))
vi.mock('../map/InteractiveFloodMap',()=>({InteractiveFloodMap:({records,controlsSlot}:any)=><div aria-label="Map records">{records.map((r:any)=><span key={r.id}>{r.label}</span>)}{controlsSlot}</div>}))
afterEach(()=>{cleanup();vi.clearAllMocks()})
it('preserves stored IDs for selection and existing refresh/cancel callbacks',()=>{
  const select=vi.fn(),cancel=vi.fn()
  const {rerender}=render(<CitizenMap selected={null} onSelect={select} onCancel={cancel}/>)
  expect(screen.getByRole('heading',{name:'Map View'})).toBeVisible()
  expect(screen.queryByText('My request locations')).not.toBeInTheDocument()
  expect(screen.queryByText('Request markers are submitted locations, not live responder positions.')).not.toBeInTheDocument()
  expect(screen.getByRole('button',{name:'Cancel Request'})).toBeDisabled()
  fireEvent.change(screen.getByRole('combobox',{name:'Request details'}),{target:{value:'stored-pending'}})
  expect(select).toHaveBeenCalledWith('stored-pending')
  expect(screen.getByText('Select request details to view here.')).toBeVisible()
  fireEvent.click(screen.getByRole('button',{name:'Refresh'}))
  expect(refetch).toHaveBeenCalledOnce()
  expect(detailRefetch).not.toHaveBeenCalled()
  rerender(<CitizenMap selected="stored-pending" onSelect={select} onCancel={cancel}/>)
  fireEvent.click(screen.getByRole('button',{name:'Refresh'}))
  expect(detailRefetch).toHaveBeenCalledOnce()
  fireEvent.click(screen.getByRole('button',{name:'Cancel Request'}))
  expect(cancel).toHaveBeenCalledOnce()
  rerender(<CitizenMap selected="stored-assigned" onSelect={select} onCancel={cancel}/>)
  expect(screen.getByRole('button',{name:'Cancel Request'})).toBeDisabled()
})
it('shows cancelled request details inline and prevents another cancellation',()=>{
  const cancel=vi.fn()
  render(<CitizenMap selected="stored-cancelled" onSelect={()=>{}} onCancel={cancel}/>)
  expect(screen.getByText('Cancelled',{exact:true})).toBeVisible()
  expect(screen.getByText('Request cancelled',{exact:true})).toHaveAttribute('role','status')
  const table=screen.getByRole('region',{name:'Request status'})
  expect(table.nextElementSibling).toHaveTextContent('Request cancelled')
  expect(screen.getByText('People needing help')).toBeVisible()
  expect(screen.getAllByText('None reported',{exact:true})).toHaveLength(3)
  expect(screen.queryByText('Select request details to view here.')).not.toBeInTheDocument()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button',{name:'Cancel Request'}))
  expect(cancel).not.toHaveBeenCalled()
})
it('keeps demo source and reports unavailable geolocation without changing submitted data',()=>{
  render(<CitizenMap selected={null} onSelect={()=>{}} onCancel={()=>{}}/>)
  expect(screen.getByRole('radio',{name:'Use demo location'})).toBeChecked()
  fireEvent.click(screen.getByRole('radio',{name:'Use current location'}))
  expect(screen.getByRole('alert')).toHaveTextContent('Location access is unavailable')
  expect(screen.getByRole('radio',{name:'Use demo location'})).toBeChecked()
})
it('locks cancellation while pending and presents failures inline',()=>{
  render(<CitizenMap selected="stored-pending" onSelect={()=>{}} onCancel={()=>{}} isCancelling cancelError="Cancellation failed. Try again."/>)
  expect(screen.getByRole('button',{name:'Cancelling…'})).toBeDisabled()
  expect(screen.getByRole('alert')).toHaveTextContent('Cancellation failed')
  expect(screen.queryByText('Request cancelled',{exact:true})).not.toBeInTheDocument()
})
