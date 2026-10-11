import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { BrandLogo, BRAND_WORDMARK_SRC } from './BrandLogo'

afterEach(cleanup)
it('uses the shared full-logo source with accessible branding and caller layout', () => {
  render(<BrandLogo className="auth-hero-logo-img"/>)
  const logo = screen.getByRole('img', {name:'ResQPH'})
  expect(logo.querySelectorAll('image')).toHaveLength(2)
  expect(logo.querySelector('image')).toHaveAttribute('href', BRAND_WORDMARK_SRC)
  expect(BRAND_WORDMARK_SRC).toBe('/brand/landing-wordmark.webp')
  expect(logo).toHaveClass('auth-hero-logo-img')
  expect(logo).not.toHaveAttribute('style')
})
it('uses the bundled transparent emblem for compact navigation', () => {
  render(<BrandLogo compact className="citizen-brand-lockup"/>)
  expect(screen.getByRole('img', {name:'ResQPH'}).querySelector('image')).toHaveAttribute('href','/brand/sidebar-emblem.png')
})

it('themes only ResQ and keeps the blue/red PH image unfiltered', () => {
  localStorage.setItem('resqph-theme','light')
  const view = render(<BrandLogo/> )
  const logo = screen.getByRole('img',{name:'ResQPH'})
  const images = logo.querySelectorAll('image')
  expect(images[0]).toHaveAttribute('filter')
  expect(images[1]).not.toHaveAttribute('filter')
  localStorage.setItem('resqph-theme','dark')
  view.rerender(<BrandLogo/> )
  expect(logo).toHaveAttribute('data-theme','dark')
  expect(images[0]).not.toHaveAttribute('filter')
  localStorage.removeItem('resqph-theme')
})
it('keeps auth branding dark independently of the saved dashboard preference',()=>{
 localStorage.setItem('resqph-theme','light')
 render(<BrandLogo theme="dark"/> )
 expect(screen.getByRole('img',{name:'ResQPH'})).toHaveAttribute('data-theme','dark')
 expect(localStorage.getItem('resqph-theme')).toBe('light')
 localStorage.removeItem('resqph-theme')
})
