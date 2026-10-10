import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AuthLayout } from './AuthLayout'
import { RoleChooser } from './RoleChooser'
import { Icon } from '../../components/art/Icon'
import { useAuth } from '../../features/auth/AuthContext'
import type { UserRole } from '../../features/auth/types'
import { validEmail, validPassword } from '../../features/auth/validation'
import { TEAM_IDS } from '../../features/auth/session'
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
    requestedRole === 'coordinator' || requestedRole === 'rescuer' ? requestedRole : 'citizen',
  )
  const [error, setError] = useState('')
  const [teamId, setTeamId] = useState<string>('team-alpha')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validEmail(email) || !validPassword(password)) {
      setError('Enter a valid email address and a password of at least 6 characters.')
      return
    }
    setError('')
    login({ email: email.trim(), role, teamId: role === 'rescuer' ? teamId : undefined })
    navigate('/dashboard', { replace: true })
  }

  return (
    <AuthLayout
      title="Login"
      subtitle="Prototype role simulation only — this is not secure production authentication"
      footer={
        <div className="auth-sub-links-col">
          <button
            type="button"
            className="auth-text-btn muted"
            onClick={() => alert('Prototype only: use a valid synthetic email and at least 6 password characters. No account verification or recovery service is provided.')}
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
        {role === 'rescuer' && <label>Simulated rescue team<select aria-label="Simulated rescue team" value={teamId} onChange={e => setTeamId(e.target.value)}>{TEAM_IDS.map(id => <option key={id} value={id}>{id}</option>)}</select></label>}

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
        <button type="submit" className="auth-btn-pill-submit">
          Log In
        </button>
      </form>
    </AuthLayout>
  )
}
