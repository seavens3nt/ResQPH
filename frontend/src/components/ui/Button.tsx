import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import './Button.css'

type Variant = 'primary' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface BaseProps {
  variant?: Variant
  size?: Size
  children: ReactNode
}

type ButtonAsButton = BaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { to?: undefined; href?: undefined }

type ButtonAsLink = BaseProps & { to: string; href?: undefined }
type ButtonAsAnchor = BaseProps & { href: string; to?: undefined }

type ButtonProps = ButtonAsButton | ButtonAsLink | ButtonAsAnchor

/** Shared call-to-action. Renders as button, router Link, or anchor. */
export function Button(props: ButtonProps) {
  const { variant = 'primary', size = 'md', children } = props
  const className = `btn btn--${variant} btn--${size}`

  if ('to' in props && props.to) {
    return (
      <Link to={props.to} className={className}>
        {children}
      </Link>
    )
  }

  if ('href' in props && props.href) {
    return (
      <a href={props.href} className={className}>
        {children}
      </a>
    )
  }

  const { variant: _v, size: _s, children: _c, ...rest } = props as ButtonAsButton
  return (
    <button className={className} {...rest}>
      {children}
    </button>
  )
}
