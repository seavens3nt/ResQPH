import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Icon } from '../art/Icon'
import './Modal.css'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  maxWidth?: string
  className?: string
  headerNote?: string
  dismissOnBackdrop?: boolean
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = '540px',
  className = '',
  headerNote,
  dismissOnBackdrop = true,
}: ModalProps) {
  const card = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  useEffect(() => { close.current = onClose }, [onClose])
  const titleId = useId()
  useEffect(() => {
    if (!isOpen) return
    const previous = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    const focusable = () => Array.from(card.current?.querySelectorAll<HTMLElement>('button, input, select, textarea, summary, a[href], [tabindex]') ?? []).filter(el => {
      if (el.tabIndex < 0 || el.matches(':disabled') || el.closest('[hidden], [inert]')) return false
      for (let node: HTMLElement | null = el; node && node !== card.current; node = node.parentElement) {
        if (getComputedStyle(node).display === 'none') return false
        if (node.tagName === 'DETAILS' && !node.hasAttribute('open') && !node.querySelector('summary')?.contains(el)) return false
      }
      return true
    })
    function handleKeyDown(e: KeyboardEvent) {
      const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"]')
      if (dialogs[dialogs.length - 1] !== card.current) return
      if (e.key === 'Escape') { e.preventDefault(); close.current() }
      if (e.key === 'Tab') {
        const nodes = focusable()
        const first = nodes[0], last = nodes[nodes.length - 1]
        if (!first) { e.preventDefault(); card.current?.focus(); return }
        if (e.shiftKey && (document.activeElement === first || document.activeElement === card.current)) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
      ;(focusable()[0] ?? card.current)?.focus()
    }
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
      if (previous?.isConnected) previous.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className={`modal-backdrop ${className}`} onClick={() => dismissOnBackdrop && onClose()} role="presentation">
      <div
        ref={card}
        tabIndex={-1}
        className="modal-card"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="modal-header">
          <div>
            {headerNote && <p className="modal-draft-note">{headerNote}</p>}
            <h3 id={titleId} className="modal-title">{title}</h3>
            {subtitle ? <p className="modal-subtitle">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="modal-body">{children}</div>

        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>
  )
}
