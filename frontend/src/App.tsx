import { Routes, Route } from 'react-router-dom'
import { useTheme } from './features/theme/useTheme'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/auth/LoginPage'
import { SignupPage } from './pages/auth/SignupPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { RequireAuth } from './features/auth/RequireAuth'
// Load shared visual rules after page styles so every role has the same baseline.
import './features/workspace/sharedVisualSystem.css'
import './components/ui/Select.css'
import './features/workspace/desktopDensity.css'
import './features/workspace/dispatcherOverview.css'
import './components/ui/actionTheme.css'
import './components/ui/cardTheme.css'
import './features/map/mapControlTheme.css'

export default function App() {
  const [dark] = useTheme()
  return (
    <div data-app-theme={dark ? 'dark' : 'light'}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/dashboard/*"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
      </Routes>
    </div>
  )
}
