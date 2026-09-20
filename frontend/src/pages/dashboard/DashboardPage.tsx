import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getApiHealth } from '../../api/health'
import { useAuth } from '../../features/auth/AuthContext'
import { ROLE_LABELS } from '../../features/auth/types'
import { Icon } from '../../components/art/Icon'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { OfflineIndicator } from '../../features/offline/OfflineIndicator'
import { CitizenView } from './views/CitizenView'
import { CoordinatorView } from './views/CoordinatorView'
import { RescuerView } from './views/RescuerView'
import { VolunteerView } from './views/VolunteerView'
import type { NavSection } from './views/navTypes'
import './dashboard.css'

export function DashboardPage() {
  const { user, logout, updateProfile } = useAuth()
  const navigate = useNavigate()
  // Sidebar & Role Switcher state
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeNav, setActiveNav] = useState<NavSection>('overview')
  const [activeRole, setActiveRole] = useState<'citizen' | 'volunteer'>('citizen')

  const [profileOpen, setProfileOpen] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [profileAvatar, setProfileAvatar] = useState('')
  const [profilePhone, setProfilePhone] = useState('')
  const [profileEmergencyName, setProfileEmergencyName] = useState('')
  const [profileEmergencyPhone, setProfileEmergencyPhone] = useState('')
  const [profileError, setProfileError] = useState('')
  const avatarInputRef = useRef<HTMLInputElement>(null)

  useQuery({ queryKey: ['api-health'], queryFn: getApiHealth })

  const view = useMemo(() => {
    if (user?.role === 'coordinator') {
      return <CoordinatorView navSection={activeNav} />
    }
    if (user?.role === 'rescuer') {
      return <RescuerView navSection={activeNav} />
    }

    if (activeRole === 'volunteer') {
      return <VolunteerView navSection={activeNav} onNavigateTab={(section) => setActiveNav(section)} />
    }

    return <CitizenView navSection={activeNav} onNavigateTab={(section) => setActiveNav(section)} />
  }, [user?.role, activeRole, activeNav])

  function handleLogout() {
    logout()
    navigate('/', { replace: true })
  }

  function toggleRoleSwitch() {
    setActiveRole((prev) => (prev === 'citizen' ? 'volunteer' : 'citizen'))
  }

  function openProfile() {
    setProfileName(user?.name ?? '')
    setProfileEmail(user?.email ?? '')
    setProfileAvatar(user?.avatarUrl ?? '')
    setProfilePhone(user?.phone ?? '')
    setProfileEmergencyName(user?.emergencyContact?.name ?? '')
    setProfileEmergencyPhone(user?.emergencyContact?.phone ?? '')
    setProfileError('')
    setProfileOpen(true)
  }

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setProfileError('Choose an image smaller than 2 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setProfileAvatar(typeof reader.result === 'string' ? reader.result : '')
    reader.readAsDataURL(file)
  }

  function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profileName.trim() || !profileEmail.trim()) {
      setProfileError('Name and email are required.')
      return
    }
    updateProfile({
      name: profileName,
      email: profileEmail,
      avatarUrl: profileAvatar || undefined,
      phone: profilePhone.trim() || undefined,
      emergencyContact: profileEmergencyName.trim() || profileEmergencyPhone.trim()
        ? {
            name: profileEmergencyName.trim(),
            phone: profileEmergencyPhone.trim(),
            relationship: 'Emergency Contact',
          }
        : undefined,
    })
    setProfileOpen(false)
  }

  if (!user) return null

  const initials = user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('')

  return (
    <div className={`dash${menuOpen ? ' dash--menu-open' : ''}`}>
      {/* OVERLAY BACKDROP */}
      {menuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR */}
      <aside className={`dash__side modern-sidebar ${menuOpen ? 'is-open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand-wrapper">
            <div className="logo-image-container">
              <img
                src="/resQPHLogo.png"
                alt="ResQPH Logo"
                className="brand-logo-img"
              />
            </div>
            <span className="brand-title">ResQPH</span>
          </div>

          <button
            type="button"
            className="mobile-close-btn"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <div className="sidebar-body">
          <div className="user-role-container">
            <span className="role-label">Logged in as</span>
            <strong className="role-value">
              {user.name || (user.role === 'coordinator' ? 'Dispatcher / Coordinator' : ROLE_LABELS[user.role])}
            </strong>
          </div>

          <nav className="sidebar-nav-list">
            <button
              type="button"
              className={`modern-nav-item ${activeNav === 'overview' ? 'is-active' : ''}`}
              onClick={() => { setActiveNav('overview'); setMenuOpen(false) }}
            >
              <Icon name="pin" size={18} />
              <span>Overview</span>
            </button>

            {/* NAV ITEM: "Track SOS" FOR VOLUNTEER, "Inquiries" FOR CITIZEN */}
            <button
              type="button"
              className={`modern-nav-item ${activeNav === 'inquiries' ? 'is-active' : ''}`}
              onClick={() => { setActiveNav('inquiries'); setMenuOpen(false) }}
            >
              <Icon name="alert" size={18} />
              <span>{activeRole === 'volunteer' ? 'Track SOS' : 'Inquiries'}</span>
              {activeRole === 'volunteer' && (
                <span className="active-red-dot" title="Live SOS Activity" />
              )}
            </button>

            <button
              type="button"
              className={`modern-nav-item ${activeNav === 'map' ? 'is-active' : ''}`}
              onClick={() => { setActiveNav('map'); setMenuOpen(false) }}
            >
              <Icon name="shield" size={18} />
              <span>Hazard Map</span>
            </button>
          </nav>
        </div>

        <div className="sidebar-footer">
          <button className="modern-logout-btn" type="button" onClick={handleLogout}>
            <Icon name="logout" size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN WORKSPACE */}
      <div className="dash__main">
        <header className="dash-header">
          <div className="header-left">
            <button
              className="btn-burger"
              type="button"
              aria-label="Toggle navigation menu"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              <Icon name="menu" size={20} />
            </button>
            <div className="header-title-group">
              <span className="header-subtitle">
                {ROLE_LABELS[user.role]} Console · Metro Manila
              </span>
              <h1 className="header-page-title">
                {user.role === 'citizen' && 'Citizen Distress & Volunteer Portal'}
                {user.role === 'rescuer' && 'Field Rescuer Mobile Guidance'}
                {user.role === 'coordinator' && 'Disaster Response Dispatcher Oversight'}
              </h1>
            </div>
          </div>

          <div className="header-center">
            <div className="header-brand-badge">
              <img
                src="/resQPHLogo.png"
                alt="ResQPH Logo"
                className="header-logo-img"
              />
            </div>
          </div>

          <div className="header-right">
            {user.role === 'citizen' && (
              <button
                type="button"
                className="btn-role-switch"
                onClick={toggleRoleSwitch}
                aria-label="Switch portal"
                title="Switch portal view"
              >
                <span className={`role-option ${activeRole === 'citizen' ? 'is-active' : 'is-inactive'}`}>
                  Citizen
                </span>
                <span className="role-divider">/</span>
                <span className={`role-option ${activeRole === 'volunteer' ? 'is-active' : 'is-inactive'}`}>
                  Volunteer
                </span>
              </button>
            )}

            <button className="avatar-badge" type="button" onClick={openProfile} aria-label="Edit profile">
              {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials || 'RQ'}
            </button>
          </div>
        </header>

        <OfflineIndicator />

        <main className="dash__content">{view}</main>
      </div>

      {/* PROFILE MODAL */}
      <Modal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        title="Edit profile"
        subtitle="Keep your account details current for the response team."
        footer={
          <>
            <Button variant="ghost" type="button" onClick={() => setProfileOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" form="profile-form">Save profile</Button>
          </>
        }
      >
        <form id="profile-form" className="profile-form" onSubmit={handleProfileSubmit}>
          <div className="profile-avatar-editor">
            <div className="profile-avatar-editor__preview">
              {profileAvatar ? <img src={profileAvatar} alt="Profile preview" /> : initials || 'RQ'}
            </div>
            <div>
              <strong>Profile photo</strong>
              <p>Use a clear photo responders can recognize.</p>
              <input ref={avatarInputRef} className="profile-avatar-editor__input" type="file" accept="image/*" onChange={handleAvatarChange} />
              <Button variant="outline" size="sm" type="button" onClick={() => avatarInputRef.current?.click()}>
                {profileAvatar ? 'Change photo' : 'Upload photo'}
              </Button>
            </div>
          </div>
          <label className="profile-form__field">
            <span>Full name</span>
            <input value={profileName} onChange={(event) => setProfileName(event.target.value)} autoComplete="name" />
          </label>
          <label className="profile-form__field">
            <span>Email address</span>
            <input type="email" value={profileEmail} onChange={(event) => setProfileEmail(event.target.value)} autoComplete="email" />
          </label>
          <label className="profile-form__field">
            <span>Phone number</span>
            <input type="tel" value={profilePhone} onChange={(event) => setProfilePhone(event.target.value)} autoComplete="tel" placeholder="For dispatch follow-up" />
          </label>
          <div className="profile-form__section-label">Emergency contact</div>
          <div className="profile-form__grid">
            <label className="profile-form__field">
              <span>Name</span>
              <input value={profileEmergencyName} onChange={(event) => setProfileEmergencyName(event.target.value)} autoComplete="name" />
            </label>
            <label className="profile-form__field">
              <span>Phone</span>
              <input type="tel" value={profileEmergencyPhone} onChange={(event) => setProfileEmergencyPhone(event.target.value)} autoComplete="tel" />
            </label>
          </div>
          {profileError ? <p className="profile-form__error" role="alert">{profileError}</p> : null}
        </form>
      </Modal>
    </div>
  )
}
