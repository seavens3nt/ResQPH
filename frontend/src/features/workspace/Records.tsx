import type { UseQueryResult } from '@tanstack/react-query'
import { errorMessage } from './errors'
import type { ReactNode } from 'react'
import { LoadingState, type LoadingLayout } from '../../components/ui/LoadingState'

export function RecordId({id}: {id: string}) { return <details className="record-id"><summary>{id.startsWith('request-') ? 'Request reference' : `${id.slice(0, 8)}…${id.slice(-6)}`}</summary><code>{id}</code></details> }
export function QueryState<T>({query, children, layout = 'card', label = 'Loading server records…'}: {query: UseQueryResult<T>; children: (data: T) => ReactNode; layout?: LoadingLayout; label?: string}) {
  if (query.data === undefined && query.fetchStatus === 'paused') return <p role="status">You’re offline. Reconnect to load these records.</p>
  if (query.isLoading) return <LoadingState layout={layout} label={label}/>
  if (query.isError && query.data === undefined) return <div role="alert"><p>{errorMessage(query.error)}</p><button onClick={() => void query.refetch()}>Retry</button></div>
  return query.data !== undefined ? <>{query.isError && <p role="alert">Could not refresh. Showing previously loaded records. <button onClick={() => void query.refetch()}>Retry</button></p>}{children(query.data)}</> : <p>No server records available.</p>
}
