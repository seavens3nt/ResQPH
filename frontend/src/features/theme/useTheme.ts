import { useSyncExternalStore } from 'react'
let memoryTheme: boolean | undefined

function readTheme(): boolean {
  try {
    const saved = localStorage.getItem('resqph-theme')
    if (saved === 'dark' || saved === 'light') return saved === 'dark'
  } catch { if (memoryTheme !== undefined) return memoryTheme }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}
function subscribe(callback: () => void) {
  const preference = window.matchMedia?.('(prefers-color-scheme: dark)')
  preference?.addEventListener?.('change', callback)
  window.addEventListener('storage', callback)
  window.addEventListener('resqph-theme-change', callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener('resqph-theme-change', callback)
    preference?.removeEventListener?.('change', callback)
  }
}
export function useTheme(): [boolean, (value: boolean | ((previous: boolean) => boolean)) => void] {
  const dark = useSyncExternalStore(subscribe, readTheme, () => false)
  return [dark, value => {
    const next = typeof value === 'function' ? value(readTheme()) : value
    try { localStorage.setItem('resqph-theme', next ? 'dark' : 'light') } catch { memoryTheme = next }
    window.dispatchEvent(new Event('resqph-theme-change'))
  }]
}
