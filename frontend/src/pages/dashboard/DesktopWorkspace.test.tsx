import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { AuthProvider } from '../../features/auth/AuthContext'
import { DashboardPage } from './DashboardPage'
import { apiClient } from '../../api/client'

const previousAdapter = apiClient.defaults.adapter
afterEach(() => {cleanup(); sessionStorage.clear(); apiClient.defaults.adapter = previousAdapter})

describe('Desktop workspace shell without the old demo provider', () => {
  it.each(['citizen','rescuer'])('renders %s with independent role navigation', async role => {
    sessionStorage.setItem('resqph.auth.user', JSON.stringify({name:'Synthetic Tester',email:`${role}@example.test`,role,teamId:role === 'rescuer' ? 'team-alpha' : undefined}))
    apiClient.defaults.adapter = async config => ({config,headers:{},status:200,statusText:'OK',data:config.url?.includes('rescue-requests') ? {items:[],total:0} : []})
    const client = new QueryClient({defaultOptions:{queries:{retry:false}}})
    render(<MemoryRouter><QueryClientProvider client={client}><AuthProvider><DashboardPage/></AuthProvider></QueryClientProvider></MemoryRouter>)
    expect(await screen.findByText('Browser online · Prototype')).toBeInTheDocument()
    expect(screen.getByRole('main').closest('.workspace-shell')).toHaveAttribute('data-role', role)
    const nav = screen.getByRole('navigation')
    expect(within(nav).getByRole('button', {name:'Account'})).toBeVisible()
    expect(screen.getByRole('link', {name:new RegExp('workspace · Synthetic Tester')})).toHaveAttribute('href','/dashboard?view=account')
    expect(screen.queryByRole('button', {name:'Sign Out'})).not.toBeInTheDocument()
    if (role !== 'citizen') {
      fireEvent.click(screen.getByRole('complementary'))
      expect(screen.getByRole('main').closest('.workspace-shell')).toHaveAttribute('data-nav-collapsed', 'true')
      fireEvent.keyDown(screen.getByRole('complementary'), {key:' '})
      expect(screen.getByRole('main').closest('.workspace-shell')).toHaveAttribute('data-nav-collapsed', 'false')
    }
    if (role === 'citizen') {
      expect(screen.queryByRole('button', {name:'Minimize sidebar'})).not.toBeInTheDocument()
      fireEvent.click(screen.getByRole('complementary'))
      expect(screen.getByRole('main').closest('.workspace-shell')).toHaveAttribute('data-nav-collapsed', 'true')
      expect(screen.getByRole('complementary')).toHaveAccessibleName(/collapsed/)
      fireEvent.click(within(nav).getByRole('button', {name:'Account'}))
      expect(within(nav).getByRole('button', {name:'Account'})).toHaveAttribute('aria-current', 'page')
      expect(screen.getByRole('main').closest('.workspace-shell')).toHaveAttribute('data-nav-collapsed', 'true')
      fireEvent.keyDown(screen.getByRole('complementary'), {key:'Enter'})
      expect(screen.getByRole('main').closest('.workspace-shell')).toHaveAttribute('data-nav-collapsed', 'false')
      fireEvent.click(within(nav).getByRole('button', {name:'Home'}))
      expect(screen.getByRole('main').closest('.workspace-shell')).toHaveAttribute('data-nav-collapsed', 'true')
      fireEvent.click(screen.getByRole('complementary'))
      expect(screen.getByRole('main').closest('.workspace-shell')).toHaveAttribute('data-nav-collapsed', 'false')
    }
    expect(nav).toBeInTheDocument()
    for (const button of within(nav).getAllByRole('button')) {
      const sidebar = screen.getByRole('complementary', {name:/sidebar,/})
      if (screen.getByRole('main').closest('.workspace-shell')?.getAttribute('data-nav-collapsed') === 'true') {
        fireEvent.keyDown(sidebar, {key:'Enter'})
      }
      expect(screen.getByRole('main').closest('.workspace-shell')).toHaveAttribute('data-nav-collapsed', 'false')
      fireEvent.click(button)
      expect(screen.getByRole('navigation')).toBeVisible()
      expect(button).toHaveAttribute('aria-current', 'page')
      expect(screen.getByRole('main').closest('.workspace-shell')).toHaveAttribute('data-nav-collapsed', 'true')
    }
    const home = screen.getByRole('link', {name:'ResQPH workspace home'})
    expect(home).toHaveAttribute('href', '/dashboard?view=overview')
    fireEvent.click(home)
    expect(screen.getByRole('navigation')).toBeVisible()
    expect(within(nav).getAllByRole('button')[0]).toHaveAttribute('aria-current', 'page')
    if (role === 'citizen') {
      const weather = screen.getByRole('region', {name:'Current weather and hourly forecast'})
      expect(weather).toBeVisible()
      expect(weather.tagName).toBe('SECTION')
      expect(weather.querySelector('summary')).toBeNull()
      expect(screen.queryByRole('region', {name:'My request locations'})).not.toBeInTheDocument()
      fireEvent.click(within(nav).getByRole('button', {name:'Map'}))
      expect(within(nav).getByRole('button', {name:'Map'})).toHaveAttribute('aria-current','page')
    }
    expect(screen.queryByText('Switch demo roles')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', {name: 'Hazard Reports'})).not.toBeInTheDocument()
    expect(screen.queryByRole('button', {name:/hotline|alternative route/i})).not.toBeInTheDocument()
    client.clear()
  })
})
