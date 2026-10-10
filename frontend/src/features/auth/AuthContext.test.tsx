import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AxiosError } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider, readApiMessage, useAuth } from './AuthContext'
import { apiClient } from '../../api/client'

function LoginHarness() {
  const { login, user } = useAuth()
  return (
    <>
      <button
        type="button"
        onClick={() => void login({ email: 'rescuer-alpha@example.test', password: 'unused-password' })}
      >
        Login rescuer
      </button>
      <output aria-label="station actor">{user?.teamId ?? ''}</output>
    </>
  )
}

describe('authenticated account state', () => {
  it('uses station membership returned by the server instead of email text', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { user: {
      id: 'account-1', email: 'rescuer-alpha@example.test', name: 'Station Rescuer', role: 'rescuer',
      station_id: 'sampaloc-fire-station', station_name: 'Sampaloc Fire Station',
      station_address: 'A.H. Lacson Ave. cor. J.F. Fajardo St.',
    } } } as never)
    render(
      <AuthProvider>
        <LoginHarness />
      </AuthProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: /login rescuer/i }))

    await waitFor(() => expect(screen.getByLabelText('station actor')).toHaveTextContent('team-sampaloc-fire-station'))
    expect(post).toHaveBeenCalledWith('/auth/login', expect.objectContaining({ email: 'rescuer-alpha@example.test' }))
    post.mockRestore()
  })
})

describe('signup error classification', () => {
  it('distinguishes connection errors from server validation errors', () => {
    expect(readApiMessage(new AxiosError('Network Error', AxiosError.ERR_NETWORK))).toMatch(/configured address and.*origin is allowed/i)
    expect(readApiMessage(new AxiosError('Request failed', undefined, undefined, undefined, {
      status: 409,
      statusText: 'Conflict',
      headers: {},
      config: {} as never,
      data: { error: { message: 'That email is already registered.' } },
    }))).toBe('That email is already registered.')
  })
})
