import { AxiosError, isCancel, type AxiosResponse } from 'axios'
import { afterEach, expect, it, vi } from 'vitest'
import { apiClient, onSessionRecovery, setExpectedAccountId } from './client'
const original = apiClient.defaults.adapter
afterEach(()=>{apiClient.defaults.adapter=original;setExpectedAccountId(undefined)})
it.each(['/missions/one','/auth/session'])('rejects a late read after an account switch: %s',async path=>{
  let release!: (response:AxiosResponse)=>void
  let config!: AxiosResponse['config']
  apiClient.defaults.adapter=input=>{config=input;return new Promise(resolve=>{release=resolve})}
  setExpectedAccountId('synthetic-account-a')
  const pending=apiClient.get(path).catch(error=>error)
  await vi.waitFor(()=>expect(release).toBeTypeOf('function'))
  if (path !== '/auth/session') expect(config.headers['X-Expected-Account-Id']).toBe('synthetic-account-a')
  setExpectedAccountId('synthetic-account-b')
  if (path !== '/auth/session') expect(config.signal?.aborted).toBe(true)
  release({data:{id:'old-mission'},status:200,statusText:'OK',headers:{},config})
  expect(isCancel(await pending)).toBe(true)
})
it.each([401,409])('emits one recovery notice and blocks old reads/mutations for HTTP %s',async status=>{
  const notice=vi.fn(),stop=onSessionRecovery(notice)
  const adapter=vi.fn(async config=>{throw new AxiosError('Rejected','ERR_BAD_REQUEST',config,undefined,{status,statusText:'Rejected',data:{error:{code:status===409?'session_identity_changed':'authentication_required'}},headers:{},config})})
  apiClient.defaults.adapter=adapter
  setExpectedAccountId('synthetic-account-a')
  await expect(apiClient.get('/rescue-requests')).rejects.toBeInstanceOf(AxiosError)
  await expect(apiClient.post('/missions/one/status-events',{})).rejects.toSatisfy(isCancel)
  expect(adapter).toHaveBeenCalledOnce()
  expect(notice).toHaveBeenCalledOnce()
  setExpectedAccountId('synthetic-account-b')
  await expect(apiClient.get('/rescue-requests')).rejects.toBeInstanceOf(AxiosError)
  expect(adapter).toHaveBeenCalledTimes(2)
  stop()
})
it('asserts account identity on profile and logout while leaving explicit login available',async()=>{
  apiClient.defaults.adapter=async config=>({data:{},status:200,statusText:'OK',headers:{},config})
  setExpectedAccountId('synthetic-account-a')
  for (const path of ['/auth/profile','/auth/logout']) {
    const response=await apiClient.post(path,{})
    expect(response.config.headers['X-Expected-Account-Id']).toBe('synthetic-account-a')
  }
  expect((await apiClient.post('/auth/login',{})).config.headers['X-Expected-Account-Id']).toBeUndefined()
})
