import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { getApiHealth } from './api/health'

vi.mock('./api/health', () => ({ getApiHealth: vi.fn() }))
const mockedGetApiHealth = vi.mocked(getApiHealth)

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter><App /></MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('App', () => {
  beforeEach(() => {
    mockedGetApiHealth.mockResolvedValue({
      service: 'ResQPH API',
      status: 'ok',
      version: '0.1.0',
    })
  })

  it('shows the prototype and API connection state', async () => {
    renderApp()
    expect(screen.getByRole('heading', { name: /flood-aware rescue coordination/i })).toBeInTheDocument()
    expect(await screen.findByText('API connected')).toBeInTheDocument()
    expect(screen.getByText(/does not provide official flood forecasts/i)).toBeInTheDocument()
  })
})
