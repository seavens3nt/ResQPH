import type { UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { LoadingState, type LoadingLayout } from '../../components/ui/LoadingState'
import { useEffect,useState } from 'react'
import { readFailure,sessionReadBlocked } from '../../api/queryRecovery'
import { retryAfterDelay } from '../../api/retryAfter'

function RefreshFailure({query,cached}:{query:UseQueryResult<unknown>;cached:boolean}) {
  const [now,setNow]=useState(Date.now)
  const failure=readFailure(query.error)
  const blocked=sessionReadBlocked(query.error)
  const until=failure.status===429 ? query.errorUpdatedAt+retryAfterDelay(query.error,60_000) : 0
  useEffect(()=>{if (!until) return;const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer)},[until])
  return <div role="alert">
    {cached && <p>Could not refresh. Showing previously loaded records. These records are stale.</p>}
    <p>{failure.status ? `HTTP ${failure.status}: ` : ''}{failure.message} {failure.code==='client_error' ? 'The response could not be validated or processed.' : ''}</p>
    {blocked ? <a href="/login">Sign in again to restore this account</a> : <button disabled={query.isFetching || now<until} onClick={()=>void query.refetch()}>{query.isFetching ? 'Refreshing…' : now<until ? `Retry in ${Math.ceil((until-now)/1000)}s` : 'Retry'}</button>}
  </div>
}

export function RecordId({id}: {id: string}) { return <details className="record-id"><summary>{id.startsWith('request-') ? 'Request reference' : `${id.slice(0, 8)}…${id.slice(-6)}`}</summary><code>{id}</code></details> }
export function QueryState<T>({query, children, layout = 'card', label = 'Loading server records…'}: {query: UseQueryResult<T>; children: (data: T) => ReactNode; layout?: LoadingLayout; label?: string}) {
  if (query.data === undefined && query.fetchStatus === 'paused') return <p role="status">You’re offline. Reconnect to load these records.</p>
  if (query.isLoading) return <LoadingState layout={layout} label={label}/>
  if (query.isError && query.data === undefined) return <RefreshFailure query={query} cached={false}/>
  return query.data !== undefined ? <>{query.isError && <RefreshFailure query={query} cached/>}{children(query.data)}</> : <p>No server records available.</p>
}
