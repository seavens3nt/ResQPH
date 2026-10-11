import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { BrandLogo, BRAND_WORDMARK_SRC } from './BrandLogo'

afterEach(cleanup)
it('uses the shared full-logo source with accessible branding and caller layout', () => {
  render(<BrandLogo className="auth-hero-logo-img"/>)
  const logo = screen.getByRole('img', {name:'ResQPH'})
  expect(logo).toHaveAttribute('src', BRAND_WORDMARK_SRC)
  expect(BRAND_WORDMARK_SRC).toBe('/brand/resqph-wordmark.png')
  expect(logo).toHaveClass('auth-hero-logo-img')
  expect(logo).not.toHaveAttribute('style')
})
it('uses the bundled transparent emblem for compact navigation', () => {
  render(<BrandLogo compact className="citizen-brand-lockup"/>)
  expect(screen.getByRole('img', {name:'ResQPH'})).toHaveAttribute('src','/brand/favicon-48.png')
})
