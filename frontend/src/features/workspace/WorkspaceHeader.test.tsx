import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WorkspaceHeader } from './WorkspaceHeader'

afterEach(cleanup)
describe('Shared dashboard header',()=>{
  it.each(['Citizen','Dispatcher','Rescuer'])('preserves %s identity and profile destination',role=>{
    const toggle=vi.fn()
    const target=role==='Dispatcher' ? '/dashboard?view=overview' : '/dashboard?view=account'
    render(<MemoryRouter><WorkspaceHeader title={`${role} page`} role={role} name="Synthetic Tester" profileTo={target} dark={false} onToggleTheme={toggle}>Browser online · Prototype</WorkspaceHeader></MemoryRouter>)
    expect(screen.getByRole('heading',{level:1,name:`${role} page`})).toBeVisible()
    expect(screen.getByRole('link',{name:`${role} workspace · Synthetic Tester`})).toHaveAttribute('href',target)
    expect(screen.getByText('Browser online · Prototype')).toBeInTheDocument()
    const theme=screen.getByRole('button',{name:'Dark mode'})
    expect(theme).toHaveAttribute('aria-pressed','false')
    fireEvent.click(theme)
    expect(toggle).toHaveBeenCalledOnce()
  })
  it('exposes the selected dark theme without inventing a role switch',()=>{
    render(<MemoryRouter><WorkspaceHeader title="Home" role="Citizen" name="Preview" profileTo="/dashboard?view=account" dark onToggleTheme={()=>{}}/></MemoryRouter>)
    expect(screen.getByRole('button',{name:'Dark mode'})).toHaveAttribute('aria-pressed','true')
    expect(screen.queryByText(/Switch demo roles/)).not.toBeInTheDocument()
  })
})
