import { render, screen, fireEvent } from '@testing-library/react'
import { it, expect, vi } from 'vitest'
import { Modal } from './Modal'
it('focuses, traps, escapes, and restores focus to the trigger', () => {
  const trigger = document.createElement('button')
  document.body.append(trigger); trigger.focus()
  const close = vi.fn()
  const view = render(<Modal isOpen onClose={close} title="Test"><input aria-label="Input"/><button>Last</button></Modal>)
  const first = screen.getByRole('button', {name:'Close dialog'})
  expect(document.activeElement).toBe(first)
  screen.getByText('Last').focus()
  fireEvent.keyDown(window, {key:'Tab'})
  expect(document.activeElement).toBe(first)
  fireEvent.keyDown(window, {key:'Escape'})
  expect(close).toHaveBeenCalledOnce()
  view.unmount()
  expect(document.activeElement).toBe(trigger)
  trigger.remove()
})
