import { act, cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { afterEach, expect, it } from 'vitest'
import { apiClient, setExpectedAccountId } from '../../api/client'
import { AuthProvider, useAuth } from './AuthContext'
import { writeSession } from './session'
const original = apiClient.defaults.adapter
function Workspace() {
  const {user,recoveryMessage}=useAuth()
  return user ? <p>Private workspace for {user.id}</p> : recoveryMessage ? <p role="alert">{recoveryMessage}</p> : <p>Sign in</p>
}
function preview(client: QueryClient) {
  return render(<QueryClientProvider client={client}><AuthProvider><Workspace/></AuthProvider></QueryClientProvider>)
}
afterEach(()=>{cleanup();apiClient.defaults.adapter=original;setExpectedAccountId(undefined);sessionStorage.clear()})
it.each([401,409])('hides old workspace and retains explicit recovery across remount for HTTP %s',async status=>{
  writeSession({id:'synthetic-account-a',email:'citizen@example.test',name:'Synthetic Citizen',role:'citizen'})
  setExpectedAccountId('synthetic-account-a')
  const client=new QueryClient()
  client.setQueryData(['rescue-requests','list','synthetic-account-a'],{items:[{id:'old-request'}]})
  const view=preview(client)
  expect(screen.getByText('Private workspace for synthetic-account-a')).toBeVisible()
  apiClient.defaults.adapter=async config=>{throw new AxiosError('Rejected','ERR_BAD_REQUEST',config,undefined,{status,statusText:'Rejected',data:{error:{code:status===409?'session_identity_changed':'authentication_required'}},headers:{},config})}
  await act(async()=>{await apiClient.get('/rescue-requests').catch(()=>{})})
  expect(screen.queryByText(/Private workspace/)).not.toBeInTheDocument()
  expect(screen.getAllByRole('alert')).toHaveLength(1)
  expect(client.getQueryCache().getAll()).toHaveLength(0)
  expect(sessionStorage.getItem('resqph.auth.recoveryRequired')).toBeTruthy()
  view.unmount();preview(client)
  expect(screen.queryByText(/Private workspace/)).not.toBeInTheDocument()
  expect(screen.getAllByRole('alert')).toHaveLength(1)
})
