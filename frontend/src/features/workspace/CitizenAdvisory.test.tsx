import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AxiosError } from 'axios'
import { apiClient } from '../../api/client'
import { CitizenAdvisory } from './CitizenAdvisory'
import { useUbeltWeather } from './useUbeltWeather'

const data = () => ({temperature:33.2,high:34,low:26,condition:'Cloudy',kind:'cloud',time:new Date().toISOString()})
const clients: QueryClient[]=[]
function setup() {
  const client = new QueryClient({defaultOptions:{queries:{retry:false}}})
  clients.push(client)
  const wrap = (ui:React.ReactNode) => <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  return {client,wrap}
}
afterEach(() => {cleanup();clients.forEach(client=>client.clear());clients.length=0;vi.restoreAllMocks();vi.unstubAllGlobals()})
it('renders metric weather, missing precipitation and practical tips, sharing cached weather across page mounts', async () => {
  const get=vi.spyOn(apiClient,'get').mockResolvedValue({data:data()})
  const {wrap}=setup()
  function HomeWeather() { const query=useUbeltWeather();return <p>{query.data?.condition ?? 'Loading'}</p> }
  const view=render(wrap(<HomeWeather/>))
  expect(await screen.findByText('Cloudy')).toBeInTheDocument()
  view.rerender(wrap(<CitizenAdvisory/>))
  expect(await screen.findByText('33.2 °C')).toBeInTheDocument()
  expect(screen.getByText(/Provider updated:/)).toHaveTextContent('PHT')
  expect(screen.getByText(/Precipitation measurements are missing/)).toBeInTheDocument()
  expect(screen.getByText(/Carry drinking water/)).toBeInTheDocument()
  expect(screen.queryByText(/Bring an umbrella/)).not.toBeInTheDocument()
  expect(get).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('button',{name:'Refresh weather'})).toBeDisabled()
})
it('shows loading and then no special conditions when available data supports no tip', async () => {
  let respond!:(value:unknown)=>void
  vi.spyOn(apiClient,'get').mockReturnValue(new Promise(resolve=>{respond=resolve}) as never)
  const {wrap}=setup();render(wrap(<CitizenAdvisory/>))
  expect(screen.getByRole('status')).toHaveTextContent('Loading advisory weather')
  respond({data:{...data(),temperature:28}})
  expect(await screen.findByText(/No special advisory conditions/)).toBeInTheDocument()
})
it('labels stale cache and pauses suggestions', () => {
  const {wrap,client}=setup()
  client.setQueryData(['weather','ubelt'],{...data(),temperatureC:33,time:new Date(Date.now()-20*60*1000).toISOString()})
  render(wrap(<CitizenAdvisory/>))
  expect(screen.getByText(/Stale cached weather/)).toBeInTheDocument()
  expect(screen.queryByText(/Carry drinking water/)).not.toBeInTheDocument()
})
it('shows unavailable and rate-limited states and honors the retry delay without an automatic retry', async () => {
  const get=vi.spyOn(apiClient,'get').mockRejectedValue(new AxiosError('Limited','ERR_BAD_RESPONSE',undefined,undefined,{status:429,headers:{'retry-after':'120'}} as never))
  const {wrap}=setup();render(wrap(<CitizenAdvisory/>))
  expect(await screen.findByRole('alert')).toHaveTextContent('rate-limited')
  expect(screen.getByRole('button',{name:'Refresh weather'})).toBeDisabled()
  fireEvent.click(screen.getByRole('button',{name:'Refresh weather'}))
  expect(get).toHaveBeenCalledTimes(1)
})
it('keeps offline cached conditions timestamped and disables refresh', () => {
  vi.spyOn(navigator,'onLine','get').mockReturnValue(false)
  const {wrap,client}=setup();client.setQueryData(['weather','ubelt'],{...data(),temperatureC:33})
  render(wrap(<CitizenAdvisory/>))
  expect(screen.getByText(/Offline. Weather cannot be refreshed/)).toBeInTheDocument()
  expect(screen.getByRole('button',{name:'Refresh weather'})).toBeDisabled()
})
it('reports missing core data as unavailable rather than fabricating weather', async () => {
  vi.spyOn(apiClient,'get').mockResolvedValue({data:{temperature:null}})
  const {wrap}=setup();render(wrap(<CitizenAdvisory/>))
  await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('Weather unavailable'))
  expect(screen.queryByText(/No special advisory conditions/)).not.toBeInTheDocument()
})
