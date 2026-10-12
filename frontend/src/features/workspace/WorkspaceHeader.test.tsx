import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WorkspaceHeader } from './WorkspaceHeader'

afterEach(cleanup)
describe('Shared dashboard header',()=>{
  it.each(['Dispatcher','Rescuer'])('preserves %s identity and profile destination',role=>{
    const toggle=vi.fn()
    const target=role==='Dispatcher' ? '/dashboard?view=overview' : '/dashboard?view=account'
    render(<MemoryRouter><WorkspaceHeader title={`${role} page`} role={role} name="Synthetic Tester" profileTo={target} dark={false} onToggleTheme={toggle}>Browser online · Prototype</WorkspaceHeader></MemoryRouter>)
    expect(screen.getByRole('heading',{level:1,name:`${role} page`})).toBeVisible()
    expect(screen.getByRole('link',{name:`${role} workspace · Synthetic Tester`})).toHaveAttribute('href',target)
    expect(screen.getByText('Browser online · Prototype')).toBeInTheDocument()
    const theme=screen.getByRole('button',{name:'Switch to dark mode'})
    expect(theme).toHaveAttribute('aria-pressed','false')
    expect(theme.querySelectorAll('svg')).toHaveLength(1)
    expect(theme.querySelector('svg')).toHaveAttribute('width','18')
    fireEvent.click(theme)
    expect(toggle).toHaveBeenCalledOnce()
  })
  it('can show Citizen identity without redirecting to the profile tab',()=>{
    render(<MemoryRouter><WorkspaceHeader title="Home" role="Citizen" name="Synthetic Tester" profileTo={null} dark={false} onToggleTheme={()=>{}}>Browser online · Prototype</WorkspaceHeader></MemoryRouter>)
    expect(screen.getByText('Citizen')).toBeInTheDocument()
    expect(screen.queryByRole('link',{name:'Citizen workspace · Synthetic Tester'})).not.toBeInTheDocument()
  })
  it('exposes the selected dark theme without inventing a role switch',()=>{
    render(<MemoryRouter><WorkspaceHeader title="Home" role="Citizen" name="Preview" profileTo="/dashboard?view=account" dark onToggleTheme={()=>{}}/></MemoryRouter>)
    expect(screen.getByRole('button',{name:'Switch to light mode'})).toHaveAttribute('aria-pressed','true')
    expect(screen.queryByText(/Switch demo roles/)).not.toBeInTheDocument()
  })
})
