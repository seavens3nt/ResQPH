import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthProvider } from '../../features/auth/AuthContext'
import { LoginPage } from './LoginPage'
import { SignupPage } from './SignupPage'

function entry(page: React.ReactNode) {
  return render(<MemoryRouter><AuthProvider>{page}</AuthProvider></MemoryRouter>)
}

describe('Accessible prototype entry', () => {
  it('offers three native role radios and visible persistent login labels', () => {
    entry(<LoginPage/>)
    expect(screen.getByRole('navigation', {name:'Account access'})).toBeVisible()
    expect(screen.getByRole('link', {name:'Create Account'})).toHaveAttribute('href','/signup')
    expect(screen.getAllByRole('radio')).toHaveLength(3)
    expect(screen.queryByRole('radio', {name: 'Volunteer'})).not.toBeInTheDocument()
    const dispatcher = screen.getByRole('radio', {name: 'Dispatcher'})
    expect(dispatcher).toHaveAttribute('type', 'radio')
    fireEvent.click(dispatcher)
    expect(dispatcher).toBeChecked()
    fireEvent.change(screen.getByLabelText('Email'), {target: {value: 'citizen@example.test'}})
    expect(screen.getByText('Email', {selector: 'label'})).toBeVisible()
    expect(screen.getByText('Password', {selector: 'label'})).toBeVisible()
    expect(screen.queryByPlaceholderText(/username/)).not.toBeInTheDocument()
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
})
