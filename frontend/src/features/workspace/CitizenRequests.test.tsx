import { cleanup,fireEvent,render,screen } from '@testing-library/react'
import { afterEach,describe,expect,it,vi } from 'vitest'
import { CitizenRequests } from './CitizenRequests'
import { useState } from 'react'
const state=vi.hoisted(()=>({query:{isLoading:false,isError:false,data:{items:[{id:'request-stored-001',status:'assigned',location:{address:'Sampaloc, Manila'},headcount:1},{id:'request-stored-002',status:'completed',location:{address:'Sampaloc, Manila'},headcount:1}],total:2},refetch:vi.fn()}}))
vi.mock('../requests/hooks',()=>({useMyRescueRequests:()=>state.query}))
afterEach(()=>{cleanup();vi.clearAllMocks();state.query.isLoading=false;state.query.isError=false})
describe('Reference My Requests layout',()=>{
  it('filters real records, keeps short labels and selects by the stored ID',()=>{
    const select=vi.fn()
    render(<CitizenRequests filter="active" onFilter={vi.fn()} onNew={vi.fn()} onSelect={select} selected={null}/>)
    expect(screen.getByRole('table')).toBeVisible()
    expect(screen.queryByRole('columnheader',{name:'Action'})).not.toBeInTheDocument()
    expect(screen.queryByText('request-stored-001')).not.toBeInTheDocument()
    expect(screen.queryByText('Completed')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'View RQ-001'}))
    expect(select).toHaveBeenCalledWith('request-stored-001')
    expect(select).toHaveBeenCalledOnce()
    expect(screen.queryByRole('complementary',{name:'Request Details'})).not.toBeInTheDocument()
    expect(document.querySelector('.requests-actions')).toContainElement(screen.getByRole('button',{name:'New Request'}))
    expect(document.querySelector('.requests-actions')).toContainElement(screen.getByRole('button',{name:'Refresh Request'}))
    expect(document.querySelector('.requests-controls')).not.toContainElement(screen.getByRole('button',{name:'New Request'}))
  })
  it.each(['Sampaloc, Manila','1','Assigned'])('selects the request when its %s cell is tapped',cell=>{
    const select=vi.fn()
    render(<CitizenRequests filter="active" onFilter={vi.fn()} onNew={vi.fn()} onSelect={select} selected={null}/>)
    fireEvent.click(screen.getByRole('cell',{name:cell}))
    expect(select).toHaveBeenCalledExactlyOnceWith('request-stored-001')
  })
  it('keeps the list in place without rendering selected details below it',()=>{
    function Preview() {
      const [selected,setSelected]=useState<string|null>(null)
      return <CitizenRequests filter="all" onFilter={vi.fn()} onNew={vi.fn()} onSelect={setSelected} selected={selected}/>
    }
    render(<Preview/> )
    fireEvent.click(screen.getByRole('cell',{name:'Completed'}))
    expect(screen.getByRole('table')).toBeVisible()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    expect(screen.getByRole('button',{name:'View RQ-002'})).toHaveAttribute('aria-pressed','true')
    expect(screen.queryByText('Select a request to view its progress and recorded history.')).not.toBeInTheDocument()
  })
  it('preserves filter, new-request and refresh actions',()=>{
    const filter=vi.fn(),newRequest=vi.fn()
    render(<CitizenRequests filter="all" onFilter={filter} onNew={newRequest} onSelect={vi.fn()} selected={null}/>)
    expect(screen.getByText('Completed')).toBeVisible()
    fireEvent.click(screen.getByRole('button',{name:'History'}))
    expect(filter).toHaveBeenCalledWith('history')
    fireEvent.click(screen.getByRole('button',{name:'New Request'}))
    expect(newRequest).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button',{name:'Refresh Request'}))
    expect(state.query.refetch).toHaveBeenCalledOnce()
  })
  it('does not fabricate screenshot records while loading',()=>{
    state.query.isLoading=true
    render(<CitizenRequests filter="active" onFilter={vi.fn()} onNew={vi.fn()} onSelect={vi.fn()} selected={null}/>)
    expect(screen.getByRole('status')).toBeVisible()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
  it('preserves loaded records and retry when a refresh fails',()=>{
    state.query.isError=true
    render(<CitizenRequests filter="active" onFilter={vi.fn()} onNew={vi.fn()} onSelect={vi.fn()} selected={null}/>)
    expect(screen.getByRole('alert')).toBeVisible()
    expect(screen.getByRole('table')).toBeVisible()
    expect(screen.getByRole('alert')).toHaveTextContent('Showing previously loaded records')
    fireEvent.click(screen.getByRole('button',{name:'Retry'}))
    expect(state.query.refetch).toHaveBeenCalledOnce()
  })
  it('shows a meaningful empty state for a filter with no matching rows',()=>{
    const completed=state.query.data.items[1]
    const records=state.query.data.items
    state.query.data.items=[completed]
    try {
      render(<CitizenRequests filter="active" onFilter={vi.fn()} onNew={vi.fn()} onSelect={vi.fn()} selected={null}/>)
      expect(screen.getByRole('status')).toHaveTextContent('No requests match this filter.')
      expect(screen.queryByRole('button',{name:'View RQ-001'})).not.toBeInTheDocument()
    } finally { state.query.data.items=records }
  })
})
