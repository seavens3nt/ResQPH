import { WorkspaceBadge, WorkspaceEmpty } from './WorkspaceUI'
import type { RescueRequestRecord } from '../requests/types'

/** Location-first overview; the Requests workspace owns the full table and inspector. */
export function RequestQueuePreview({ requests, onSelect, onViewAll, previewLimit = 5, showAllLink = true }: {
  requests: RescueRequestRecord[]
  onSelect: (id: string) => void
  onViewAll: () => void
  previewLimit?: number
  showAllLink?: boolean
}) {
  const pending = requests.filter(request => request.status === 'pending')
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
  if (!pending.length) return <WorkspaceEmpty title="No pending requests" icon="check">
    New requests will appear here when the server receives them.
  </WorkspaceEmpty>
  return <>
    <ul className="workspace-queue-preview" aria-label="Pending request overview">
      {pending.slice(0, previewLimit).map(request => <li key={request.id}>
        <div><strong>{request.location.address}</strong>
          <p>{request.headcount} {request.headcount === 1 ? 'person' : 'people'} needing assistance</p>
          <time dateTime={request.created_at}>Received {new Date(request.created_at).toLocaleString()}</time>
        </div>
        <div className="workspace-queue-actions"><WorkspaceBadge status="pending">Pending</WorkspaceBadge>
          <button aria-label={`View request at ${request.location.address}`} onClick={() => onSelect(request.id)}>View</button>
        </div>
      </li>)}
    </ul>
    {showAllLink && <button className="workspace-text-action" onClick={onViewAll}>View all {pending.length} pending requests</button>}
  </>
}
