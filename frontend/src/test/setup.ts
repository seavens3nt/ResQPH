import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Ensure localStorage is available in jsdom environment
if (typeof window !== 'undefined' && (!window.localStorage || typeof window.localStorage.getItem !== 'function')) {
  const store: Record<string, string> = {}
  const storageMock = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value)
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k])
    },
    get length() {
      return Object.keys(store).length
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  }
  Object.defineProperty(window, 'localStorage', { value: storageMock, writable: true })
  Object.defineProperty(globalThis, 'localStorage', { value: storageMock, writable: true })
}

// Ensure the rendered DOM is torn down between tests so queries stay isolated.
afterEach(() => {
  cleanup()
  localStorage.clear()
})
