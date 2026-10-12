import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../components/art/Icon'

/** Shared chrome; callers own the role, destination and current page title. */
export function WorkspaceHeader({title,role,name,profileTo,dark,onToggleTheme,children}: {
  title:string; role:string; name:string; profileTo?:string | null;
  dark:boolean; onToggleTheme:()=>void; children?:ReactNode;
  dispatcherArtwork?:boolean;
}) {
  const rolePill = <><Icon name="user" size={22}/><span>{role}</span><Icon name="chevron-right" size={18}/></>
  return <header className="workspace-topbar citizen-topbar">
    <h1>{title}</h1>
    <div>
      <span className="workspace-header-status"><span>{role} workspace</span>{children}</span>
      <button className="citizen-theme-toggle" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Switch to light mode' : 'Switch to dark mode'} aria-pressed={dark} onClick={onToggleTheme}>
        <Icon name={dark ? 'sun' : 'moon'} size={18}/>
      </button>
      {profileTo
        ? <Link className="citizen-role-pill" to={profileTo} aria-label={`${role} workspace · ${name}`} title={`${name} · ${role}`}>{rolePill}</Link>
        : <span className="citizen-role-pill" aria-label={`${role} workspace · ${name}`} title={`${name} · ${role}`}>{rolePill}</span>}
    </div>
  </header>
}
