import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AxiosError } from 'axios'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { apiClient } from '../../api/client'
import { AuthProvider } from '../../features/auth/AuthContext'
import { LoginPage } from './LoginPage'
import { SignupPage } from './SignupPage'

function entry(page: React.ReactNode) {
  return render(<MemoryRouter initialEntries={['/signup']}><AuthProvider>{page}<PathProbe /></AuthProvider></MemoryRouter>)
}

function PathProbe() {
  return <output aria-label="current route">{useLocation().pathname}</output>
}

function advanceToLocation() {
  const next = () => fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Synthetic' } })
  fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Tester' } })
  next()
  fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: '09123456789' } })
  next()
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'citizen@example.test' } })
  next()
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Synthetic-pass-123' } })
  fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'Synthetic-pass-123' } })
  next()
  fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
}

describe('Accessible prototype entry', () => {
  it('offers citizen and rescuer roles with visible login labels', () => {
    entry(<LoginPage/>)
    expect(screen.getByRole('navigation', {name:'Account access'})).toBeVisible()
    expect(screen.getByRole('link', {name:'Create Account'})).toHaveAttribute('href','/signup')
    expect(screen.getAllByRole('radio')).toHaveLength(2)
    expect(screen.queryByRole('radio', {name: 'Volunteer'})).not.toBeInTheDocument()
    const citizen = screen.getByRole('radio', {name: 'Citizen'})
    expect(citizen).toHaveAttribute('type', 'radio')
    expect(citizen).toBeChecked()
    fireEvent.change(screen.getByLabelText('Email'), {target: {value: 'citizen@example.test'}})
    expect(screen.getByText('Email', {selector: 'label'})).toBeVisible()
    expect(screen.getByText('Password', {selector: 'label'})).toBeVisible()
    expect(screen.queryByPlaceholderText(/username/)).not.toBeInTheDocument()
  })

  it('offers the five catalog stations and displays the selected station address', () => {
    entry(<LoginPage />)
    fireEvent.click(screen.getByRole('radio', { name: 'Rescuer' }))
    const station = screen.getByRole('combobox', { name: 'Which rescue station are you from?' })
    expect(station).toHaveValue('')
    expect(screen.getAllByRole('option')).toHaveLength(6)
    fireEvent.change(station, { target: { value: 'iverson-fire-rescue' } })
    expect(screen.getByText('622 Sobriedad St.')).toBeVisible()
    expect(screen.queryByText(/team-alpha|team-bravo|team-charlie/i)).not.toBeInTheDocument()
  })

  it('keeps signup fields labeled and names the optional final step after 5/5', () => {
    entry(<SignupPage/>)
    expect(screen.getByRole('link', {name:'Login'})).toHaveAttribute('href','/login')
    const next = () => fireEvent.click(screen.getByRole('button', {name: 'Continue'}))
    fireEvent.change(screen.getByLabelText('First name'), {target: {value: 'Synthetic'}})
    fireEvent.change(screen.getByLabelText('Last name'), {target: {value: 'Tester'}})
    next()
    fireEvent.change(screen.getByLabelText('Mobile number'), {target: {value: '09123456789'}})
    next()
    fireEvent.change(screen.getByLabelText('Email'), {target: {value: 'citizen@example.test'}})
    next()
    fireEvent.change(screen.getByLabelText('Password'), {target: {value: 'synthetic-pass'}})
    fireEvent.change(screen.getByLabelText('Confirm password'), {target: {value: 'synthetic-pass'}})
    expect(screen.getByRole('button', {name: 'Show confirmed password'})).toBeVisible()
    next()
    expect(screen.getByText('5 / 5')).toBeVisible()
    expect(screen.getByLabelText('Emergency contact name')).toBeInTheDocument()
    expect(screen.getByLabelText('Relationship')).toBeInTheDocument()
    expect(screen.getByLabelText('Emergency contact number')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', {name: 'Skip'}))
    expect(screen.getByText('Optional final step · Location access')).toBeVisible()
    expect(screen.getByRole('button', {name: 'Not Now'})).toBeVisible()
  })

  it('allows skipping location and shows a connection-specific error without claiming signup succeeded', async () => {
    const post = vi.spyOn(apiClient, 'post').mockRejectedValue(new AxiosError('Network Error', AxiosError.ERR_NETWORK))
    entry(<SignupPage />)
    advanceToLocation()
    fireEvent.click(screen.getByRole('button', { name: 'Not Now' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/Could not reach the ResQPH API.*page origin is allowed/i)
    expect(screen.getByLabelText('current route')).toHaveTextContent('/signup')
    expect(post).toHaveBeenCalledWith('/auth/register', expect.objectContaining({ location_permission: false }))
    post.mockRestore()
  })

  it.each([
    { code: 1, message: /Location permission was denied/ },
    { code: 3, message: /Location lookup timed out/ },
  ])('continues registration when geolocation returns code $code and waits for server confirmation', async ({ code, message }) => {
    let confirmRegistration: ((response: { data: { id: string; email: string; name: string; role: 'citizen' } }) => void) | undefined
    const pendingResponse = new Promise<{ data: { id: string; email: string; name: string; role: 'citizen' } }>(resolve => {
      confirmRegistration = resolve
    })
    const post = vi.spyOn(apiClient, 'post').mockReturnValue(pendingResponse as never)
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (_success: PositionCallback, fail: PositionErrorCallback) => {
          fail({ code, message: 'synthetic geolocation failure' } as GeolocationPositionError)
        },
      },
    })
    entry(<SignupPage />)
    advanceToLocation()
    fireEvent.click(screen.getByRole('button', { name: 'Allow Location' }))

    expect(await screen.findByText(message)).toBeVisible()
    expect(screen.getByLabelText('current route')).toHaveTextContent('/signup')
    expect(post).toHaveBeenCalledWith('/auth/register', expect.objectContaining({ location_permission: false }))

    confirmRegistration?.({ data: { id: 'citizen-1', email: 'citizen@example.test', name: 'Synthetic Tester', role: 'citizen' } })
    await waitFor(() => expect(screen.getByLabelText('current route')).toHaveTextContent('/dashboard'))
    post.mockRestore()
    vi.unstubAllGlobals()
  })
})
