import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { Button } from './Button'
import { UnfinishedRequestNotice } from '../../features/workspace/UnfinishedRequestNotice'

it('preserves shared button styling when a caller adds a class', () => {
  render(<Button variant="danger" className="custom-action">Cancel record</Button>)
  expect(screen.getByRole('button')).toHaveClass('btn', 'btn--danger', 'btn--md', 'custom-action')
})

it('uses the same draft actions and preserves their handlers', () => {
  const resume = vi.fn(), discard = vi.fn()
  render(<UnfinishedRequestNotice onResume={resume} onDiscard={discard} />)
  const resumeButton = screen.getByRole('button', { name: 'Resume draft' })
  const discardButton = screen.getByRole('button', { name: 'Discard draft' })
  expect(resumeButton).toHaveAttribute('data-action-tone', 'secondary')
  expect(discardButton).toHaveAttribute('data-action-tone', 'danger')
  expect(resumeButton).toHaveAttribute('type', 'button')
  fireEvent.click(resumeButton)
  fireEvent.click(discardButton)
  expect(resume).toHaveBeenCalledOnce()
  expect(discard).toHaveBeenCalledOnce()
})
