import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LocationStatusCard } from './LocationStatusCard'

describe('LocationStatusCard', () => {
  it('renders a location, coordinates, and operational status', () => {
    render(
      <LocationStatusCard
        title="Volunteer Station: Sampaloc Zone"
        coordinates="14.6042 N · 120.9946 E"
        statusLabel="Field Active"
      />,
    )

    expect(screen.getByText('Volunteer Station: Sampaloc Zone')).toBeInTheDocument()
    expect(screen.getByText('14.6042 N · 120.9946 E')).toBeInTheDocument()
    expect(screen.getByText('Field Active')).toBeInTheDocument()
  })
})
