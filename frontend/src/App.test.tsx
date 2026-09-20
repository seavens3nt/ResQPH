import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './features/auth/AuthContext'
import App from './App'
import { getApiHealth } from './api/health'

vi.mock('./api/health', () => ({ getApiHealth: vi.fn() }))
const mockedGetApiHealth = vi.mocked(getApiHealth)

function renderApp(initialRoute = '/') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
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

  it('renders the landing page at /', () => {
    renderApp('/')
    expect(screen.getByRole('heading', { name: /ResQPH/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Get Started/i })).toBeInTheDocument()
  })

  it('renders the login page at /login', () => {
    renderApp('/login')
    expect(screen.getByRole('heading', { name: /Login/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  })

  it('renders the signup page at /signup', () => {
    renderApp('/signup')
    expect(screen.getByRole('heading', { name: /Create an account/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
  })

  it('redirects /dashboard to /login when not authenticated', () => {
    renderApp('/dashboard')
    expect(screen.getByRole('heading', { name: /Login/i })).toBeInTheDocument()
  })
})
