import { WorkspaceCard, WorkspaceSectionHeading } from '../../features/workspace/WorkspaceUI'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'
import { ROLE_LABELS, type UserRole } from '../../features/auth/types'
import { AccountWorkspace } from '../../features/workspace/AccountWorkspace'
import { Icon, type IconName } from '../../components/art/Icon'
import { CitizenWorkspace } from '../../features/workspace/CitizenWorkspace'
import { RescuerWorkspace } from '../../features/workspace/RescuerWorkspace'
import { CitizenDraftProvider } from '../../features/workspace/CitizenDraft'
import { FigmaHomeAsset } from '../../features/workspace/FigmaHomeAsset'
import { WorkspaceHeader } from '../../features/workspace/WorkspaceHeader'
import './dashboard.css'
import '../../features/workspace/workspace.css'
import '../../features/workspace/citizenDesign.css'
import '../../features/workspace/referenceTheme.css'
import '../../features/workspace/screenshotHome.css'
import '../../features/workspace/screenshotRequests.css'
import '../../features/workspace/sidebar.css'
import '../../features/workspace/figmaWorkspace.css'

const navigation: Record<UserRole, [string, string][]> = {
  citizen: [['overview', 'Home'], ['inquiries', 'My Requests'], ['map', 'Map'], ['account', 'Account']],
  rescuer: [['overview', 'My Mission'], ['routes', 'Routes'], ['history', 'Mission History'], ['account', 'Account']],
}
const navIcons: Record<string, IconName> = {overview:'shield',inquiries:'report',map:'map-fold',routes:'route',account:'user',reports:'warning',missions:'boat',teams:'volunteers',history:'clock'}

function ConnectionStatus() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {window.removeEventListener('online', update); window.removeEventListener('offline', update)}
  }, [])
  return <span className="workspace-connection">{online ? 'Browser online · Prototype' : 'Browser offline · Limited cache'}</span>
}


export function DashboardPage() {
  const {user} = useAuth()
  const [params, setParams] = useSearchParams()
  const [help, setHelp] = useState(false)
  const [navCollapsed, setNavCollapsed] = useState(false)
  const [dark, setDark] = useState(false)
  if (!user) return null
  const items = navigation[user.role]
  const requestedSection = params.get('view')
  const section = user.role === 'citizen' && requestedSection === 'request' ? 'request' : items.some(([key]) => key === requestedSection) ? requestedSection! : 'overview'
  const go = (key: string) => {
    setNavCollapsed(true)
    setParams({view:key})
  }
  const citizenNavIcons = {overview:'home',inquiries:'requests',map:'map',account:'account'} as const
  return <CitizenDraftProvider key={user.email}><div className="workspace-shell" data-role={user.role} data-view={section} data-nav-collapsed={navCollapsed} data-theme={dark ? 'dark' : 'light'}>
    <aside className="workspace-nav" id="workspace-sidebar"
      tabIndex={0}
      aria-label={`${ROLE_LABELS[user.role]} sidebar, ${navCollapsed ? 'collapsed' : 'expanded'}. Press Enter or Space to toggle.`}
      onClick={event => {
        const interactive = (event.target as HTMLElement).closest('button,a')
        setNavCollapsed(value => interactive ? true : !value)
      }}
      onKeyDown={event => {
        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          setNavCollapsed(value => !value)
        }
      }}>
      <Link className="workspace-brand" to="/dashboard?view=overview" aria-label="ResQPH workspace home"><img className="citizen-brand-lockup" src={navCollapsed ? '/logo.png' : '/figma-home/0e8b2.png'} alt="ResQPH"/></Link>
      <nav aria-label={ROLE_LABELS[user.role] + ' navigation'}>{items.map(([key,label]) => {const citizenIcon = citizenNavIcons[key as keyof typeof citizenNavIcons];return <button key={key} aria-label={label} title={label} aria-current={section === key || (section === 'request' && key === 'inquiries') ? 'page' : undefined} onClick={() => go(key)}>{citizenIcon ? <FigmaHomeAsset name={citizenIcon} variant={section === 'map' ? 'map' : section === 'inquiries' ? 'requests' : 'home'}/> : <Icon name={navIcons[key]} size={20}/>}<span className="workspace-nav-label">{label}</span></button>})}</nav>
      <button aria-label="Help & limitations" title="Help & limitations" onClick={() => setHelp(!help)} aria-expanded={help}><FigmaHomeAsset name="help"/><span className="workspace-nav-label">Help</span></button>
    </aside>
    <main className="workspace-main">
      <WorkspaceHeader title={user.role === 'citizen' ? ['overview','inquiries'].includes(section) ? 'Home' : section === 'request' ? 'Request rescue' : items.find(([key])=>key===section)?.[1] ?? 'Home' : section === 'overview' ? 'My Mission' : items.find(([key])=>key===section)?.[1] ?? ROLE_LABELS[user.role]} role={ROLE_LABELS[user.role]} name={user.name} profileTo="/dashboard?view=account" dark={dark} onToggleTheme={()=>setDark(value=>!value)}><ConnectionStatus/></WorkspaceHeader>
      {help && <WorkspaceCard ><h2>Prototype limitations</h2><p>This is not an emergency service. Flood information is controlled/historical, routes are not guaranteed safe, and authentication is for this prototype. Offline support is one cached rescuer mission and one pending next-valid update.</p><a href="/login" target="_blank" rel="noopener noreferrer">Open entry in another browser profile</a></WorkspaceCard>}
      {section === 'account' ? <AccountWorkspace/> :
        user.role === 'citizen' ? <CitizenWorkspace section={section}/> :
        <section className="role-workspace">
          <WorkspaceSectionHeading icon={section === 'overview' ? undefined : navIcons[section]}>{section === 'overview' ? 'My Mission' : items.find(([key])=>key===section)?.[1]}</WorkspaceSectionHeading>
          <RescuerWorkspace section={section}/>
        </section>}
    </main>
  </div></CitizenDraftProvider>
}
