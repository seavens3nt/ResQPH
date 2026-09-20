import { Link } from 'react-router-dom'
import { ResqLogo } from '../brand/ResqLogo'
import './SiteFooter.css'

const links = ['Home', 'About', 'Features', 'Get Involved', 'FAQ']

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <Link to="/" className="site-footer__brand" aria-label="ResQPH home">
          <ResqLogo size={26} />
          <span>ResQPH</span>
        </Link>

        <nav className="site-footer__nav" aria-label="Footer">
          {links.map((label) => (
            <a key={label} href={`#${label.toLowerCase().replace(/\s+/g, '-')}`}>
              {label}
            </a>
          ))}
        </nav>

        <p className="site-footer__meta">
          © 2026 ResQPH. Academic engineering prototype. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
