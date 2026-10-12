import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './features/auth/AuthContext'
import './index.css'
import App from './App'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
})

// Cache only the production UI shell; mission/event data remains actor-scoped in IndexedDB.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register('/offline-shell.js').catch(() => {
    console.warn('Offline application reload is unavailable; reconnect before reopening the app.')
  })
}
// Ask an old production worker to fetch Vite's development-only reset script.
// Register no worker in development, and leave unrelated registrations alone.
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations().then(registrations => Promise.all(
    registrations.filter(registration => {
      const worker = registration.active ?? registration.waiting ?? registration.installing
      return worker && new URL(worker.scriptURL).origin === location.origin
        && new URL(worker.scriptURL).pathname === '/offline-shell.js'
    }).map(registration => registration.update()),
  )).catch(() => console.warn('Could not refresh the local application preview.'))
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
