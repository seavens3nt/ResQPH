import { Link } from 'react-router-dom'
import { Button } from '../ui/Button'
import { useAuth } from '../../features/auth/AuthContext'
import './SiteHeader.css'

const links = [
  { label: 'Home', href: '#top' },
  { label: 'About', href: '#about' },
  { label: 'Features', href: '#features' },
  { label: 'Get Involved', href: '#get-involved' },
  { label: 'FAQ', href: '#faq' },
]

export function SiteHeader() {
  const { user } = useAuth()

  return (
    <header className="site-header" id="top">
      <div className="site-header__inner">
        <Link to="/" className="site-header__brand" aria-label="ResQPH home">
          <img src="/resqph-logo.png" alt="ResQPH logo" className="site-header__logo-img" />
          <span>ResQPH</span>
        </Link>

        <nav className="site-header__nav" aria-label="Primary">
          {links.map((link) => (
            <a key={link.label} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="site-header__actions">
          {user ? (
            <Button to="/dashboard" variant="primary">
              Open dashboard
            </Button>
          ) : (
            <>
              <Button to="/login" variant="outline">
                Log in
              </Button>
              <Button to="/signup" variant="primary">
                Get started
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
