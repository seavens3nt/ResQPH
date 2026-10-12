import {act,cleanup,renderHook} from '@testing-library/react'
import {afterEach,expect,it} from 'vitest'
import {useTheme} from './useTheme'
afterEach(()=>{cleanup();localStorage.removeItem('resqph-theme')})
it('restores persisted theme immediately and synchronizes separate consumers',()=>{
  localStorage.setItem('resqph-theme','dark')
  const landing=renderHook(useTheme)
  const dashboard=renderHook(useTheme)
  expect(landing.result.current[0]).toBe(true)
  expect(dashboard.result.current[0]).toBe(true)
  act(()=>landing.result.current[1](false))
  expect(dashboard.result.current[0]).toBe(false)
  expect(localStorage.getItem('resqph-theme')).toBe('light')
})
