import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AuthLayout } from './AuthLayout'
import { RoleChooser } from './RoleChooser'
import { Icon } from '../../components/art/Icon'
import { useAuth } from '../../features/auth/AuthContext'
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
    requestedRole === 'coordinator' || requestedRole === 'rescuer' ? requestedRole : 'citizen',
  )
  const [error, setError] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Enter your email and password to continue.')
      return
    }
    setError('')
    login({ email: email.trim(), role })
    navigate('/dashboard', { replace: true })
  }

  return (
    <AuthLayout
      title="Login"
      subtitle="Hey enter your details to sign in to your account"
      footer={
        <div className="auth-sub-links-col">
          <button
            type="button"
            className="auth-text-btn muted"
            onClick={() => alert('For prototype demo: enter any email & password to sign in immediately.')}
          >
            Having trouble to sign in?
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

        {/* Email Field with Pill Border and Icon */}
        <div className="auth-pill-field">
          <span className="auth-pill-icon">
            <Icon name="user" size={17} />
          </span>
          <input
            type="email"
            className="auth-pill-input"
            placeholder="Enter your username/email"
            aria-label="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Password Field with Pill Border and Icon */}
        <div className="auth-pill-field">
          <span className="auth-pill-icon">
            <Icon name="shield" size={17} />
          </span>
          <input
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
