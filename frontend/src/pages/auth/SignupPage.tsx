import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../../components/art/Icon'
import { useAuth } from '../../features/auth/AuthContext'
import type { UserRole } from '../../features/auth/types'
import './auth.css'

type Step = 'name' | 'phone' | 'email' | 'password' | 'emergency' | 'location'

const STEP_ORDER: Step[] = ['name', 'phone', 'email', 'password', 'emergency', 'location']
const TOTAL_STEPS = STEP_ORDER.length - 1 // location screen doesn't count as a "form" step

function stepNumber(step: Step): number {
  return STEP_ORDER.indexOf(step) + 1
}

export function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('name')

  // Fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [ecName, setEcName] = useState('')
  const [ecRelationship, setEcRelationship] = useState('')
  const [ecPhone, setEcPhone] = useState('')
  const [error, setError] = useState('')

  function next() { setStep(s => STEP_ORDER[STEP_ORDER.indexOf(s) + 1] ?? s) }
  function back() { setError(''); setStep(s => STEP_ORDER[STEP_ORDER.indexOf(s) - 1] ?? s) }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (step === 'name') {
      if (!firstName.trim() || !lastName.trim()) { setError('Enter your first and last name.'); return }
      next(); return
    }
    if (step === 'phone') {
      if (!phone.trim()) { setError('Enter your mobile number.'); return }
      next(); return
    }
    if (step === 'email') {
      if (!email.trim() || !email.includes('@')) { setError('Enter a valid email address.'); return }
      next(); return
    }
    if (step === 'password') {
      if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
      if (password !== confirmPassword) { setError('Passwords do not match.'); return }
      next(); return
    }
    if (step === 'emergency') {
      // all optional — just proceed
      next(); return
    }
  }

  function finishSignup(locationGranted: boolean) {
    const role: UserRole = 'citizen'
    signup({
      name: `${firstName.trim()} ${lastName.trim()}`,
      email: email.trim(),
      role,
      phone: phone.trim(),
      emergencyContact: ecName.trim()
        ? { name: ecName.trim(), relationship: ecRelationship.trim(), phone: ecPhone.trim() }
        : undefined,
      locationPermission: locationGranted,
    })
    navigate('/dashboard', { replace: true })
  }

  function handleAllowLocation() {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => finishSignup(true),
        () => finishSignup(false),
      )
    } else {
      finishSignup(false)
    }
  }

  // ── Location screen (no card/form chrome) ─────────────────────
  if (step === 'location') {
    return (
      <div className="auth-mobile-page">
        <div className="auth-phone-shell">
          <div className="auth-location-screen">
            <div className="auth-location-icon" aria-hidden="true">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <h2 className="auth-location-title">Help rescuers find you faster.</h2>
            <p className="auth-location-body">
              ResQPH shares your location only when you send an SOS. It's never tracked in the background.
            </p>
            <button className="auth-btn-pill-submit" onClick={handleAllowLocation}>
              Allow Location
            </button>
            <button className="auth-text-btn muted" style={{ marginTop: 14 }} onClick={() => finishSignup(false)}>
              Not Now
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Progress bar ───────────────────────────────────────────────
  const currentNum = stepNumber(step)
  const progress = (currentNum / TOTAL_STEPS) * 100

  // ── Step meta ──────────────────────────────────────────────────
  const stepMeta: Record<Exclude<Step, 'location'>, { title: string; subtitle: string }> = {
    name:      { title: "What's your name?",         subtitle: 'This is how rescuers will identify you.' },
    phone:     { title: 'Your mobile number',         subtitle: 'Used to reach you during an emergency.' },
    email:     { title: 'Your email address',         subtitle: 'For account recovery and alerts.' },
    password:  { title: 'Create a password',          subtitle: 'At least 6 characters.' },
    emergency: { title: 'Emergency contact',          subtitle: 'Who should we call if you need help? You can skip this.' },
  }

  const meta = stepMeta[step as Exclude<Step, 'location'>]

  return (
    <div className="auth-mobile-page">
      <div className="auth-phone-shell signup-focused">

        {/* Logo header */}
        <div className="auth-hero-banner">
          <img
            src="/logo.png"
            alt="ResQPH"
            className="auth-hero-logo-img"
          />
          <p className="auth-hero-wordmark">ResQ<span className="auth-hero-wordmark__p">P</span><span className="auth-hero-wordmark__h">H</span></p>
        </div>

        {/* Progress */}
        <div className="signup-progress-bar" role="progressbar" aria-valuenow={currentNum} aria-valuemax={TOTAL_STEPS}>
          <div className="signup-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Form area */}
        <div className="auth-body-container">

          {/* Back + step count */}
          <div className="signup-step-nav">
            {currentNum > 1 ? (
              <button type="button" className="signup-back-btn" onClick={back} aria-label="Go back">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 5l-7 7 7 7"/>
                </svg>
              </button>
            ) : (
              <span />
            )}
            <span className="signup-step-count">{currentNum} / {TOTAL_STEPS}</span>
          </div>

          {/* Title */}
          <div className="signup-step-header">
            <h1 className="visually-hidden">Create an account</h1>
            <h2 className="signup-step-title">{meta.title}</h2>
            <p className="signup-step-subtitle">{meta.subtitle}</p>
          </div>

          <form className="auth-clean-form signup-single-step" onSubmit={handleSubmit} noValidate>

            {step === 'name' && (
              <>
                <div className="auth-pill-field">
                  <span className="auth-pill-icon"><Icon name="user" size={16} /></span>
                  <input
                    className="auth-pill-input"
                    type="text"
                    placeholder="First name"
                    aria-label="First name / full name"
                    autoComplete="given-name"
                    autoFocus
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                  />
                </div>
                <div className="auth-pill-field">
                  <span className="auth-pill-icon"><Icon name="user" size={16} /></span>
                  <input
                    className="auth-pill-input"
                    type="text"
                    placeholder="Last name"
                    aria-label="Last name"
                    autoComplete="family-name"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                  />
                </div>
              </>
            )}

            {step === 'phone' && (
              <div className="auth-pill-field">
                <span className="auth-pill-icon"><Icon name="phone" size={16} /></span>
                <input
                  className="auth-pill-input"
                  type="tel"
                  placeholder="09XX XXX XXXX"
                  aria-label="Mobile number"
                  autoComplete="tel"
                  autoFocus
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
            )}

            {step === 'email' && (
              <div className="auth-pill-field">
                <span className="auth-pill-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                </span>
                <input
                  className="auth-pill-input"
                  type="email"
                  placeholder="Email address"
                  aria-label="Email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            )}

            {step === 'password' && (
              <>
                <div className="auth-pill-field">
                  <span className="auth-pill-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  <input
                    className="auth-pill-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    aria-label="Password"
                    autoComplete="new-password"
                    autoFocus
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button type="button" className="auth-pill-toggle" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide' : 'Show'}>
                    <Icon name={showPassword ? 'eye-off' : 'eye'} size={16} />
                  </button>
                </div>
                <div className="auth-pill-field">
                  <span className="auth-pill-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  <input
                    className="auth-pill-input"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Confirm password"
                    aria-label="Confirm password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                  />
                  <button type="button" className="auth-pill-toggle" onClick={() => setShowConfirm(v => !v)} aria-label={showConfirm ? 'Hide' : 'Show'}>
                    <Icon name={showConfirm ? 'eye-off' : 'eye'} size={16} />
                  </button>
                </div>
              </>
            )}

            {step === 'emergency' && (
              <>
                <div className="auth-pill-field">
                  <span className="auth-pill-icon"><Icon name="user" size={16} /></span>
                  <input
                    className="auth-pill-input"
                    type="text"
                    placeholder="Contact name"
                    aria-label="Emergency contact name"
                    autoFocus
                    value={ecName}
                    onChange={e => setEcName(e.target.value)}
                  />
                </div>
                <div className="auth-pill-field">
                  <span className="auth-pill-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </span>
                  <input
                    className="auth-pill-input"
                    type="text"
                    placeholder="Relationship (e.g. Mother)"
                    aria-label="Relationship"
                    value={ecRelationship}
                    onChange={e => setEcRelationship(e.target.value)}
                  />
                </div>
                <div className="auth-pill-field">
                  <span className="auth-pill-icon"><Icon name="phone" size={16} /></span>
                  <input
                    className="auth-pill-input"
                    type="tel"
                    placeholder="Contact mobile number"
                    aria-label="Emergency contact number"
                    value={ecPhone}
                    onChange={e => setEcPhone(e.target.value)}
                  />
                </div>
              </>
            )}

            {error && <p className="auth-error-alert" role="alert">{error}</p>}

            <button type="submit" className="auth-btn-pill-submit">
              {step === 'emergency' ? (ecName.trim() ? 'Continue' : 'Skip') : 'Continue'}
            </button>

            {step === 'name' && (
              <p className="auth-signup-switch" style={{ textAlign: 'center', marginTop: 8 }}>
                Already have an account?{' '}
                <Link to="/login" className="auth-text-btn highlight">Sign in</Link>
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
