import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AuthProvider, useAuth } from './AuthContext'

function LoginHarness() {
  const { login, user } = useAuth()
  return (
    <>
      <button
        type="button"
        onClick={() => login({ email: 'rescuer-alpha@example.test', role: 'rescuer' })}
      >
        Login rescuer
      </button>
      <output aria-label="demo actor">{user?.demoActorId ?? ''}</output>
    </>
  )
}

describe('prototype auth actor mapping', () => {
  it('maps a rescuer alpha demo login to the assigned team actor id', () => {
    render(
      <AuthProvider>
        <LoginHarness />
      </AuthProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: /login rescuer/i }))

    expect(screen.getByLabelText('demo actor')).toHaveTextContent('team-alpha')
  })
})
