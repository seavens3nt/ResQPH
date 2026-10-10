import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { RequestSubmittedNotice } from './RequestSubmittedNotice'

afterEach(()=>{cleanup();vi.useRealTimers()})
it('expires after eight seconds',()=>{
  vi.useFakeTimers()
  const expire=vi.fn()
  render(<RequestSubmittedNotice onExpire={expire}/> )
  expect(screen.getByRole('status')).toHaveTextContent('Your request has successfully been submitted!')
  act(()=>vi.advanceTimersByTime(7999))
  expect(expire).not.toHaveBeenCalled()
  act(()=>vi.advanceTimersByTime(1))
  expect(expire).toHaveBeenCalledOnce()
})
it('pauses while hovered or focused and cleans up on unmount',()=>{
  vi.useFakeTimers()
  const expire=vi.fn()
  const {unmount}=render(<RequestSubmittedNotice onExpire={expire}/> )
  const notice=screen.getByRole('status')
  fireEvent.mouseEnter(notice)
  act(()=>vi.advanceTimersByTime(10000))
  fireEvent.focus(notice)
  fireEvent.mouseLeave(notice)
  act(()=>vi.advanceTimersByTime(10000))
  expect(expire).not.toHaveBeenCalled()
  fireEvent.blur(notice)
  act(()=>vi.advanceTimersByTime(8000))
  expect(expire).toHaveBeenCalledOnce()
  unmount()
  act(()=>vi.advanceTimersByTime(8000))
  expect(expire).toHaveBeenCalledOnce()
})
