import { BrandLogo } from '../../components/brand/BrandLogo'
import type { ReactNode } from 'react'
import './auth.css'

interface AuthLayoutProps {
  children: ReactNode
  rawContainer?: boolean
  title?: string
  subtitle?: string
  footer?: ReactNode
  iconBadge?: ReactNode
  hideHeader?: boolean
}

export function AuthLayout({
  children,
  rawContainer = false,
  title,
  subtitle,
  footer,
  hideHeader = false,
}: AuthLayoutProps) {
  return (
    <div className="auth-mobile-page">
      <div className="auth-phone-shell">
        {/* Header with ResQPH logo */}
        <div className="auth-hero-banner">
          <BrandLogo theme="dark" className="auth-hero-logo-img"/>
        </div>

        {/* Form area */}
        <div className="auth-body-container">
          {!hideHeader && title && (
            <div className="auth-title-block">
              <h1 className="auth-main-title">{title}</h1>
              {subtitle && <p className="auth-main-subtitle">{subtitle}</p>}
            </div>
          )}

          {rawContainer ? children : <div className="auth-inner-content">{children}</div>}

          {footer && <div className="auth-bottom-footer">{footer}</div>}
        </div>
      </div>
    </div>
  )
}
