import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CitizenHome } from './CitizenHome'

const state = vi.hoisted(()=>({
  query: {isLoading:false,isError:false,data:{items:[{id:'request-synthetic-001',status:'assigned',location:{address:'Jhocson St. Manila'},headcount:2}]},refetch:vi.fn()},
  hourly:{data:[{time:'2026-10-10T04:00:00Z',endTime:'2026-10-10T05:00:00Z',temperature:29,condition:'Light rain',kind:'rain',isDaytime:true,rainChance:40,rainAmount:0.3,windSpeed:5,humidity:80,pressure:1010}],isError:false,fetchStatus:'idle'},
}))
vi.mock('../requests/hooks',()=>({useMyRescueRequests:()=>state.query}))
vi.mock('./useUbeltWeather',()=>({useUbeltWeather:()=>({data:{temperature:29,high:31,low:25,condition:'Rain',kind:'rain',time:'2026-10-10T04:00:00Z',windSpeed:5,windDirection:'SOUTHWEST',humidity:80},isError:false,isFetching:false,refetch:vi.fn()}),useUbeltHourlyWeather:()=>state.hourly}))
function RouteEvidence() { return <output>{useLocation().search}</output> }
afterEach(()=>{cleanup();state.query.isLoading=false;state.query.isError=false;state.hourly.isError=false})
describe('Screenshot-based citizen Home',()=>{
  it('keeps the assigned request server-backed and opens its tracking',()=>{
    const view=vi.fn()
    render(<MemoryRouter><CitizenHome hasDraft={false} onView={view} onRequest={vi.fn()}/></MemoryRouter>)
    expect(screen.getByText('Jhocson St. Manila')).toBeVisible()
    expect(screen.getByText('2 People')).toBeVisible()
    expect(screen.getByText('Assigned')).toBeVisible()
    expect(screen.getByText('RQ-001')).toBeVisible()
    expect(screen.queryByText('Request reference')).not.toBeInTheDocument()
    expect(screen.queryByText('request-synthetic-001')).not.toBeInTheDocument()
    expect(screen.getByRole('region',{name:'Current weather and hourly forecast'})).toBeVisible()
    expect(screen.getByText('Hourly Forecast')).toBeVisible()
    expect(screen.getAllByText('0.3 mm').length).toBeGreaterThan(0)
    expect(screen.queryByText('18 mm/hr')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Weather summary')).toHaveTextContent('29°Rainfeels like: —low: 25°high: 31°')
    expect(screen.getByRole('list')).toHaveTextContent('12 PMLight rain29°0.3 mmRain 40%')
    expect(screen.getByRole('list')).not.toHaveTextContent('km/h')
    expect(screen.getByRole('list')).not.toHaveTextContent('hPa')
    expect(document.querySelector('.figma-hourly-chart')).toBeNull()
    fireEvent.click(screen.getByRole('button',{name:'View Details'}))
    expect(view).toHaveBeenCalledWith('request-synthetic-001')
  })
  it('labels the retained forecast when an update fails',()=>{
    state.hourly.isError=true
    render(<MemoryRouter><CitizenHome hasDraft={false} onView={vi.fn()} onRequest={vi.fn()}/></MemoryRouter>)
    expect(screen.getByText('Last received forecast — may be outdated.')).toBeVisible()
    expect(screen.queryByText('Controlled Rainfall Scenario')).not.toBeInTheDocument()
  })
  it('opens the existing draft without navigating away',()=>{
    const open = vi.fn()
    render(<MemoryRouter initialEntries={['/dashboard?view=overview']}><CitizenHome hasDraft onView={vi.fn()} onRequest={open}/><RouteEvidence/></MemoryRouter>)
    expect(screen.getByText('Resume rescue request')).toBeVisible()
    fireEvent.click(screen.getByRole('button',{name:'Request rescue'}))
    expect(open).toHaveBeenCalledOnce()
    expect(screen.getByText('?view=overview')).toBeVisible()
  })
  it('does not display an invented request while data is loading',()=>{
    state.query.isLoading=true
    render(<MemoryRouter><CitizenHome hasDraft={false} onView={vi.fn()} onRequest={vi.fn()}/></MemoryRouter>)
    expect(screen.getByRole('status')).toHaveTextContent('Loading server records')
    expect(screen.queryByText('Assigned')).not.toBeInTheDocument()
  })
})
