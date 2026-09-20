import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SidebarNavItem } from './SidebarNavItem'

describe('SidebarNavItem', () => {
  it('renders its active state and reports the selected section', () => {
    const onSelect = vi.fn()

    render(
      <SidebarNavItem
        section="map"
        activeSection="map"
        icon="shield"
        label="Hazard Map"
        onSelect={onSelect}
      />,
    )

    const item = screen.getByRole('button', { name: 'Hazard Map' })
    expect(item).toHaveClass('is-active')

    fireEvent.click(item)
    expect(onSelect).toHaveBeenCalledWith('map')
  })
})
