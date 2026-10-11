import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LocationOptions } from './LocationOptions'

describe('Location options', () => {
  it('starts closed, summarizes source, and opens without requesting GPS', () => {
    const choose = vi.fn()
    render(<LocationOptions source="map" disabled={false} onChooseSource={choose}/>)
    const trigger = screen.getByRole('button', {name:'Location options'})
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('Source: Map pin')).toBeVisible()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('group', {name:'Location source'})).toHaveAttribute('id', trigger.getAttribute('aria-controls'))
    expect(choose).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('radio', {name:'Use my location'}))
    expect(choose).toHaveBeenCalledWith('gps')
    fireEvent.click(trigger)
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  })
  it('dismisses with Escape and restores trigger focus; outside interaction dismisses', () => {
    render(<><LocationOptions source="demo" disabled={false} onChooseSource={vi.fn()}/><button>Outside</button></>)
    const trigger = screen.getByRole('button', {name:'Location options'})
    fireEvent.click(trigger)
    const radio = screen.getByRole('radio', {name:'Use demo location'})
    radio.focus()
    fireEvent.keyDown(radio, {key:'Escape'})
    expect(trigger).toHaveFocus()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(trigger)
    fireEvent.pointerDown(screen.getByRole('button', {name:'Outside'}))
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })
  it('contains map interaction and disables selection while GPS is loading', () => {
    const mapClick = vi.fn()
    render(<div onClick={mapClick}><LocationOptions source="demo" disabled onChooseSource={vi.fn()}/></div>)
    fireEvent.click(screen.getByRole('button', {name:'Location options'}))
    expect(screen.getByRole('radio', {name:'Use my location'})).toBeDisabled()
    fireEvent.click(screen.getByText('Location source'))
    expect(mapClick).not.toHaveBeenCalled()
  })
})
