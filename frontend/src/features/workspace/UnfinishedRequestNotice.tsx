import { WorkspaceCard } from './WorkspaceUI'
import './unfinishedRequestNotice.css'

export function UnfinishedRequestNotice({onResume,onDiscard}: {onResume:()=>void;onDiscard:()=>void}) {
  return <WorkspaceCard className="unfinished-request-notice" aria-label="Unsubmitted request draft">
    <p>No request has been sent. Your draft is kept in this tab only.</p>
    <h2>You have an unfinished request</h2>
    <div className="unfinished-request-actions">
      <button type="button" data-action-tone="secondary" onClick={onResume}>Resume draft</button>
      <button type="button" data-action-tone="danger" className="unfinished-request-discard" onClick={onDiscard}>Discard draft</button>
    </div>
  </WorkspaceCard>
}
