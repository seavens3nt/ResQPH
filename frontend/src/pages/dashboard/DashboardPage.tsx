import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getApiHealth } from '../../api/health'
import { useAuth } from '../../features/auth/AuthContext'
import { ROLE_LABELS } from '../../features/auth/types'
import type { UserRole } from '../../features/auth/types'
import { Icon } from '../../components/art/Icon'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { OfflineIndicator } from '../../features/offline/OfflineIndicator'
import { CitizenView } from './views/CitizenView'
import { CoordinatorView } from './views/CoordinatorView'
import { RescuerView } from './views/RescuerView'
import type { NavSection } from './views/navTypes'
import './dashboard.css'

export function DashboardPage() {
  const { user, logout, updateProfile } = useAuth()
  const navigate = useNavigate()
  // Sidebar & Role Switcher state
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeNav, setActiveNav] = useState<NavSection>('overview')

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

    return <CitizenView navSection={activeNav} onNavigateTab={(section) => setActiveNav(section)} />
  }, [user?.role, activeNav])

  function handleLogout() {
    logout()
    navigate('/', { replace: true })
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

  const navItems: { section: NavSection; label: string; icon: 'pin' | 'alert' | 'navigation' | 'route' | 'user' | 'shield' | 'check' }[] =
    user.role === 'rescuer'
      ? [
          { section: 'overview', label: 'Assigned Team & Progress', icon: 'route' },
          { section: 'inquiries', label: 'Rescue Target Details', icon: 'user' },
          { section: 'missions', label: 'Flood-Aware Navigation', icon: 'navigation' },
          { section: 'incidents', label: 'Rescue Records', icon: 'check' },
        ]
      : user.role === 'coordinator'
      ? [
          { section: 'overview', label: 'Dispatch Overview', icon: 'pin' },
          { section: 'inquiries', label: 'Rescue Request Queue', icon: 'alert' },
          { section: 'missions', label: 'Active Responses', icon: 'route' },
          { section: 'teams', label: 'Rescue Fleet Status', icon: 'user' },
          { section: 'map', label: 'Hazard Map & Route Oversight', icon: 'navigation' },
          { section: 'incidents', label: 'Incident Reports', icon: 'check' },
        ]
      : [
          { section: 'overview', label: 'Overview', icon: 'pin' },
          { section: 'inquiries', label: 'Rescue Tracking', icon: 'alert' },
          { section: 'map', label: user.role === 'citizen' ? 'Rescue Team Location' : 'Hazard Map', icon: 'navigation' },
        ]

  const pageTitles: Record<UserRole, Partial<Record<NavSection, string>>> = {
    citizen: {
      overview: 'Overview',
      inquiries: 'Rescue Tracking',
      map: 'Rescue Team Location',
    },
    coordinator: {
      overview: 'Central Dispatch Console',
      inquiries: 'Dispatch Request Queue',
      missions: 'Active Responses',
      teams: 'Rescue Fleet Status',
      map: 'Hazard Map & Route Oversight',
      incidents: 'Incident Reports',
    },
    rescuer: {
      overview: 'Assigned Team & Progress',
      inquiries: 'Rescue Target Details',
      missions: 'Flood-Aware Navigation',
      incidents: 'Rescue Records',
    },
  }

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
                src="/logo.png"
                alt=""
                aria-hidden="true"
                className="brand-logo-img"
              />
            </div>
            <span className="brand-title">
              ResQ<span className="brand-title__p">P</span><span className="brand-title__h">H</span>
            </span>
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
              {user.name || (ROLE_LABELS[user.role] ?? user.role)}
            </strong>
          </div>

          <nav className="sidebar-nav-list">
            {navItems.map((item) => (
              <button
                key={item.section}
                type="button"
                className={`modern-nav-item ${activeNav === item.section ? 'is-active' : ''}`}
                aria-current={activeNav === item.section ? 'page' : undefined}
                onClick={() => { setActiveNav(item.section); setMenuOpen(false) }}
              >
                <Icon name={item.icon} size={18} />
                <span>{item.label}</span>
              </button>
            ))}
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

          </div>

          <h1 className="header-page-title visually-hidden">
            {pageTitles[user.role][activeNav] ?? ROLE_LABELS[user.role]}
          </h1>

          <div className="header-right">
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
