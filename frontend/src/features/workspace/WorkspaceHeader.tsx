import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { FigmaHomeAsset } from './FigmaHomeAsset'

/** Shared chrome; callers own the role, destination and current page title. */
export function WorkspaceHeader({title,role,name,profileTo,dark,onToggleTheme,children}: {
  title:string; role:string; name:string; profileTo:string;
  dark:boolean; onToggleTheme:()=>void; children?:ReactNode;
}) {
  return <header className="workspace-topbar citizen-topbar">
    <h1>{title}</h1>
    <div>
      <span className="workspace-header-status"><span>{role} workspace</span>{children}</span>
      <button className="citizen-theme-toggle" aria-label="Dark mode" aria-pressed={dark} onClick={onToggleTheme}>
        <FigmaHomeAsset name="sun"/><FigmaHomeAsset name="moon"/>
      </button>
      <Link className="citizen-role-pill" to={profileTo} aria-label={`${role} workspace · ${name}`} title={`${name} · ${role}`}>{role}</Link>
    </div>
  </header>
}
