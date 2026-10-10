import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WorkspaceBadge, WorkspaceCard, WorkspaceFilters, WorkspaceStatCard, WorkspaceTable, WorkspaceSplit, WorkspaceFacts, WorkspaceProgress, WorkspaceTimeline, WorkspaceEmpty } from './WorkspaceUI'

afterEach(cleanup)

describe('Reusable workspace UI', () => {
  it('keeps list content and inspector in distinct semantic regions', () => {
    render(<WorkspaceSplit inspector={<h3>Selected request</h3>}><button>View</button></WorkspaceSplit>)
    expect(within(screen.getByRole('complementary')).getByRole('heading', {name:'Selected request'})).toBeInTheDocument()
    expect(screen.getByRole('button',{name:'View'}).closest('aside')).toBeNull()
  })
  it('preserves falsy and rich fact values without substituting sample content', () => {
    render(<WorkspaceFacts items={[{label:'People',value:0},{label:'Request',value:<code>actual-id</code>}]}/>)
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('actual-id').tagName).toBe('CODE')
  })
  it('marks only the server-selected progress step as current', () => {
    render(<WorkspaceProgress label="Progress" stages={[{value:'assigned',label:'Assigned'},{value:'arrived',label:'Arrived'}]} current="arrived"/>)
    const items = within(screen.getByRole('list',{name:'Progress'})).getAllByRole('listitem')
    expect(items[0]).not.toHaveAttribute('aria-current')
    expect(items[1]).toHaveAttribute('aria-current','step')
  })
  it('does not mark a made-up stage when the current status is outside the progression', () => {
    render(<WorkspaceProgress label="Progress" stages={[{value:'assigned',label:'Assigned'}]} current="cancelled"/>)
    expect(screen.getByRole('listitem')).not.toHaveClass('is-reached')
  })
  it('renders timestamped history with notes and no inferred events', () => {
    render(<WorkspaceTimeline events={[{id:'event-1',status:'en-route',timestamp:'2026-10-01T00:00:00Z',note:'Sanitized note'}]}/>)
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText('en route')).toBeInTheDocument()
    expect(screen.getByText('Sanitized note')).toBeInTheDocument()
    expect(document.querySelector('time')).toHaveAttribute('datetime','2026-10-01T00:00:00Z')
  })
  it('keeps empty state actions usable', () => {
    const retry = vi.fn()
    render(<WorkspaceEmpty title="No mission" action={<button onClick={retry}>Retry</button>}>Reconnect to load an assignment.</WorkspaceEmpty>)
    fireEvent.click(screen.getByRole('button',{name:'Retry'}))
    expect(retry).toHaveBeenCalledOnce()
  })
  it('preserves card semantics, styles, children, attributes and handlers', () => {
    const click = vi.fn()
    render(<WorkspaceCard as="article" className="coordinator-active" aria-label="Active mission" data-testid="card" onClick={click}><h2>Mission details</h2></WorkspaceCard>)
    const card = screen.getByRole('article', {name:'Active mission'})
    expect(card).toHaveClass('workspace-card', 'coordinator-active')
    expect(within(card).getByRole('heading', {name:'Mission details'})).toBeInTheDocument()
    fireEvent.click(card)
    expect(click).toHaveBeenCalledOnce()
  })

  it('supports a named section by default and retains hidden state', () => {
    const {rerender} = render(<WorkspaceCard aria-label="Weather">Scenario</WorkspaceCard>)
    expect(screen.getByRole('region', {name:'Weather'}).tagName).toBe('SECTION')
    rerender(<WorkspaceCard aria-label="Weather" hidden>Scenario</WorkspaceCard>)
    expect(screen.getByText('Scenario')).not.toBeVisible()
  })

  it('supports inspector aside semantics without duplicating base classes', () => {
    render(<WorkspaceCard as="aside" aria-label="Inspector">Report details</WorkspaceCard>)
    expect(screen.getByRole('complementary', {name:'Inspector'})).toHaveAttribute('class', 'workspace-card')
  })

  it('uses state styling while preserving custom badge copy', () => {
    render(<WorkspaceBadge status="pending">Pending assignment</WorkspaceBadge>)
    expect(screen.getByText('Pending assignment')).toHaveClass('workspace-badge', 'state-pending')
  })

  it('uses the status as badge copy when no explicit label is supplied', () => {
    render(<WorkspaceBadge status="completed"/>)
    expect(screen.getByText('completed')).toHaveClass('state-completed')
  })

  it('exposes controlled filter selection and keeps extra actions', () => {
    const change = vi.fn()
    render(<WorkspaceFilters options={['active','history']} value="active" onChange={change} label="Request filter"><button>New request</button></WorkspaceFilters>)
    const group = screen.getByRole('group', {name:'Request filter'})
    expect(within(group).getByRole('button', {name:'active'})).toHaveAttribute('aria-pressed','true')
    const history = within(group).getByRole('button', {name:'history'})
    expect(history).toHaveAttribute('type','button')
    fireEvent.click(history)
    expect(change).toHaveBeenCalledWith('history')
    expect(within(group).getByRole('button', {name:'New request'})).toBeInTheDocument()
  })

  it('renders a statistic as an accessible actionable card, including zero', () => {
    const click = vi.fn()
    render(<WorkspaceStatCard count={0} label="Pending requests" icon="report" tone="pending" onClick={click}/>)
    const card = screen.getByRole('button', {name:'0 Pending requests'})
    expect(card).toHaveClass('stat-pending')
    fireEvent.click(card)
    expect(click).toHaveBeenCalledOnce()
  })

  it('shares the table shell without taking ownership of row actions', () => {
    const click = vi.fn()
    render(<WorkspaceTable headings={['Location','Action']} caption="Submitted reports"><tr><td>U-Belt</td><td><button onClick={click}>View report</button></td></tr></WorkspaceTable>)
    const table = screen.getByRole('table', {name:'Submitted reports'})
    expect(table).toHaveClass('workspace-table')
    expect(within(table).getByRole('columnheader', {name:'Location'})).toHaveAttribute('scope','col')
    fireEvent.click(within(table).getByRole('button', {name:'View report'}))
    expect(click).toHaveBeenCalledOnce()
  })
})
