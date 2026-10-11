import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AuthLayout } from './AuthLayout'
import { RoleChooser } from './RoleChooser'
import { Icon } from '../../components/art/Icon'
import { readApiMessage, useAuth } from '../../features/auth/AuthContext'
import { validEmail, validPassword } from '../../features/auth/validation'
import { RESCUE_STATIONS } from '../../features/map/stations'
import type { UserRole } from '../../features/auth/types'
import './auth.css'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const requestedRole = searchParams.get('role')
  const [role, setRole] = useState<UserRole>(
    requestedRole === 'rescuer' ? requestedRole : 'citizen',
  )
  const [error, setError] = useState('')
  const [stationId, setStationId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validEmail(email) || !validPassword(password)) {
      setError('Enter a valid email address and a password of at least 12 characters.')
      return
    }
    if (role === 'rescuer' && !RESCUE_STATIONS.some((station) => station.station_id === stationId)) {
      setError('Select your rescue station to continue.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await login({ email: email.trim(), password, stationId: role === 'rescuer' ? stationId : undefined })
      navigate('/dashboard', { replace: true })
    } catch (reason) {
      setError(readApiMessage(reason))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Login"
      subtitle="Sign in to access your ResQPH account"
      footer={
        <div className="auth-sub-links-col">
          <button
            type="button"
            className="auth-text-btn muted"
            onClick={() => setError('Check your email and password. If you still cannot sign in, contact your account administrator.')}
          >
            Trouble signing in?
          </button>
          <p className="auth-signup-switch">
            Don't have an account?{' '}
            <button
              type="button"
              className="auth-text-btn highlight"
              onClick={() => navigate('/signup')}
            >
              Sign Up Now
            </button>
          </p>
        </div>
      }
    >
      <form className="auth-clean-form" onSubmit={handleSubmit} noValidate>
        {/* Segmented Portal Role Chooser */}
        <RoleChooser value={role} onChange={setRole} />
        {role === 'rescuer' && <div className="auth-station-field">
          <p className="auth-station-guidance">Station accounts are provided by the project administrator.</p>
          <label className="auth-field-label" htmlFor="rescue-station">Which rescue station are you from?</label>
          <select id="rescue-station" aria-label="Which rescue station are you from?" value={stationId} onChange={(event) => setStationId(event.target.value)} required>
            <option value="">Select your station</option>
            {RESCUE_STATIONS.map((station) => <option key={station.station_id} value={station.station_id}>{station.name}</option>)}
          </select>
          {stationId && <p className="auth-station-address">{RESCUE_STATIONS.find((station) => station.station_id === stationId)?.address}</p>}
        </div>}

        {/* Email Field with Pill Border and Icon */}
        <div className="auth-pill-field">
          <label className="auth-field-label" htmlFor="login-email">Email</label>
          <span className="auth-pill-icon">
            <Icon name="user" size={17} />
          </span>
          <input
            id="login-email"
            type="email"
            className="auth-pill-input"
            placeholder="citizen@example.test"
            aria-label="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Password Field with Pill Border and Icon */}
        <div className="auth-pill-field">
          <label className="auth-field-label" htmlFor="login-password">Password</label>
          <span className="auth-pill-icon">
            <Icon name="shield" size={17} />
          </span>
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            className="auth-pill-input"
            placeholder="Enter your password"
            aria-label="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="auth-pill-toggle"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            <Icon name={showPassword ? 'eye-off' : 'eye'} size={17} />
          </button>
        </div>

        {error ? (
          <p className="auth-error-alert" role="alert">
            {error}
          </p>
        ) : null}

        {/* Main Red Login In Button */}
        <button type="submit" className="auth-btn-pill-submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Log In'}
        </button>
      </form>
    </AuthLayout>
  )
}
