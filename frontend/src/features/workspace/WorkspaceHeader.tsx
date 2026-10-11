import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../components/art/Icon'

/** Shared chrome; callers own the role, destination and current page title. */
export function WorkspaceHeader({title,role,name,profileTo,dark,onToggleTheme,children}: {
  title:string; role:string; name:string; profileTo:string;
  dark:boolean; onToggleTheme:()=>void; children?:ReactNode;
  dispatcherArtwork?:boolean;
}) {
  return <header className="workspace-topbar citizen-topbar">
    <h1>{title}</h1>
    <div>
      <span className="workspace-header-status"><span>{role} workspace</span>{children}</span>
      <button className="citizen-theme-toggle" aria-label="Dark mode" aria-pressed={dark} onClick={onToggleTheme}>
        <span className="theme-icon-slot"><Icon name="sun" size={30}/></span><span className="theme-icon-slot"><Icon name="moon" size={30}/></span>
      </button>
      <Link className="citizen-role-pill" to={profileTo} aria-label={`${role} workspace · ${name}`} title={`${name} · ${role}`}><Icon name="user" size={22}/><span>{role}</span><Icon name="chevron-right" size={18}/></Link>
    </div>
  </header>
}
