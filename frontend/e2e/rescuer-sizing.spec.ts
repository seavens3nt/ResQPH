import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

test.use({ channel: process.env.RESQPH_TEST_BROWSER_CHANNEL })
const fixture = JSON.parse(readFileSync(new URL('../../data/samples/offline-mission.example.json', import.meta.url), 'utf8')).mission
const viewports = [
  { width: 1280, height: 720, theme: 'light' }, { width: 1366, height: 768, theme: 'light' },
  { width: 1440, height: 900, theme: 'light' }, { width: 1920, height: 1080, theme: 'light' },
  { width: 768, height: 1024, theme: 'light' }, { width: 390, height: 844, theme: 'light' },
  { width: 1440, height: 900, theme: 'dark' }, { width: 390, height: 844, theme: 'dark' },
]

async function layout(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready)
  const metrics = await page.evaluate(() => ({
    width: innerWidth, height: innerHeight, scale: visualViewport?.scale,
    overflow: document.documentElement.scrollWidth - innerWidth,
    bad: [...document.querySelectorAll('.workspace-main button, .workspace-main input:not([type=file]), .workspace-main textarea, .workspace-card, .workspace-inspector')]
      .filter(element => element.getClientRects().length && !element.closest('.google-map-wrapper, .workspace-table-wrap'))
      .filter(element => { const box = element.getBoundingClientRect(); return box.left < -1 || box.right > innerWidth + 1 })
      .map(element => `${element.tagName}.${element.className}`),
    iconErrors: [...document.querySelectorAll('.workspace-nav button > svg, .workspace-topbar svg')]
      .filter(element => { const box = element.getBoundingClientRect(); return Math.abs(box.width - box.height) > 1 })
      .map(element => { const box = element.getBoundingClientRect(); return { parent: element.parentElement?.getAttribute('aria-label'), width: box.width, height: box.height } }),
  }))
  expect(metrics.scale).toBe(1)
  expect(metrics.width).toBe(page.viewportSize()!.width)
  expect(metrics.height).toBe(page.viewportSize()!.height)
  expect(metrics.overflow, `${name} document overflow`).toBeLessThanOrEqual(1)
  expect(metrics.bad, `${name} clipped/offscreen controls`).toEqual([])
  expect(metrics.iconErrors, `${name} square icons`).toEqual([])
  await page.screenshot({ path: test.info().outputPath(`${name}.png`), fullPage: !await page.getByRole('dialog').count() })
}

for (const viewport of viewports) {
  for (const collapsed of [false, true]) {
    test(`Rescuer sizing ${viewport.width}x${viewport.height} ${viewport.theme} collapsed=${collapsed}`, async ({ browser }) => {
      test.setTimeout(120_000)
      const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce', colorScheme: viewport.theme as 'light' | 'dark' })
      const page = await context.newPage()
      let state = 'populated'
      let writes = 0
      const mission = { ...fixture, id: 'mission-sizing-001', team_id: 'team-sampaloc-fire-station', station_id: 'sampaloc-fire-station', assigned_rescuer_id: 'team-sampaloc-fire-station', status: 'arrived', version: 3,
        request_summary: { ...fixture.request_summary, location: { ...fixture.request_summary.location, address: 'Synthetic U-Belt location — long location details remain readable without clipping or losing request information.' } } }
      const history = Array.from({ length: 12 }, (_, index) => ({ ...mission, id: `mission-history-${index}`, status: index % 2 ? 'cancelled' : 'completed' }))
      await page.route('**/api/v1/**', async route => {
        const url = new URL(route.request().url())
        if (route.request().method() !== 'GET') { writes++; await route.fulfill({ status: 403, json: { error: { code: 'fixture_no_writes', message: 'Presentation check only.' } } }); return }
        if (url.pathname.endsWith('/auth/session')) { await route.fulfill({ json: { user: { id: 'sizing-rescuer', role: 'rescuer', name: 'Synthetic Rescuer', email: 'sizing@example.test', station_id: mission.station_id, station_name: 'Sampaloc Fire Station', station_address: 'Synthetic station address for responsive layout verification' } } }); return }
        if (state === 'loading') await new Promise(resolve => setTimeout(resolve, 900))
        if (state === 'error') { await route.fulfill({ status: 503, json: { error: { code: 'fixture_unavailable', message: 'Synthetic server unavailable. Your data has not been changed.' } } }); return }
        if (url.pathname.endsWith('/tracking')) { await route.fulfill({ json: { mission_id: mission.id, request_id: mission.request_id, team_id: mission.team_id, simulation_status: 'arrived', position: mission.request_summary.location.point, timestamp: new Date().toISOString(), route_geometry: { type: 'LineString', coordinates: [[120.9931, 14.608], [120.9938198, 14.5977093]] }, progress_ratio: 1, remaining_distance_m: 0, estimated_remaining_time_s: 0, total_distance_m: 550, total_travel_time_s: 85, warnings: [] } }); return }
        if (url.pathname.endsWith('/missions')) { await route.fulfill({ json: state === 'empty' ? [] : url.searchParams.has('status') ? [mission] : history }); return }
        if (url.pathname.includes('/missions/')) { await route.fulfill({ json: mission }); return }
        await route.fulfill({ status: 404, json: { error: { code: 'fixture_unavailable', message: 'Presentation fixture only.' } } })
      })
      async function open(view: string) {
        await page.goto(`/dashboard?view=${view}`)
        await expect(page.locator('.workspace-nav')).toBeVisible()
        if (collapsed) { await page.locator('.workspace-nav').focus(); await page.keyboard.press('Enter') }
        await expect(page.locator('.workspace-shell')).toHaveAttribute('data-nav-collapsed', String(collapsed))
        if (viewport.width <= 850) {
          const railWidth = (await page.locator('.workspace-nav').boundingBox())!.width
          const menuWidth = (await page.locator('.workspace-nav nav').boundingBox())!.width
          const sizing = await page.locator('.workspace-nav nav').evaluate(node => ({ width: getComputedStyle(node).width, flex: getComputedStyle(node).flex, direction: getComputedStyle(node.parentElement!).flexDirection, align: getComputedStyle(node.parentElement!).alignItems }))
          // Phone row layouts also reserve space for the compact logo and Help.
          const minimumWidth = sizing.direction === 'row' ? Math.min(200, railWidth * .7) : railWidth * .7
          expect(menuWidth, `narrow navigation must not retain desktop width: ${JSON.stringify(sizing)}`).toBeGreaterThanOrEqual(minimumWidth)
          if (collapsed) expect((await page.locator('.workspace-nav').boundingBox())!.height, 'compact narrow rail').toBeLessThan(120)
        }
      }
      const chrome: unknown[] = []
      for (const view of ['overview', 'routes', 'history', 'account', 'help']) {
        await open(view)
        if (view === 'overview' || view === 'routes') await expect(page.getByRole('button', { name: 'TAP RESCUE COMPLETED' })).toBeVisible()
        if (view === 'history') {
          await expect(page.locator('tbody tr')).toHaveCount(12)
          await page.getByRole('button', { name: 'View', exact: true }).first().click()
          await page.locator('.workspace-table-wrap').evaluate(node => { node.scrollLeft = 0 })
          await expect(page.getByRole('heading', { name: 'Mission details', exact: true })).toBeVisible()
          const actionStyle = await page.getByRole('button', { name: 'View', exact: true }).first().evaluate(node => ({ width: node.getBoundingClientRect().width, whiteSpace: getComputedStyle(node).whiteSpace }))
          expect(actionStyle.width).toBeGreaterThanOrEqual(72)
          expect(actionStyle.whiteSpace).toBe('nowrap')
          const padding = await page.locator('tbody td').first().evaluate(node => getComputedStyle(node).paddingTop)
          expect(parseFloat(padding)).toBeGreaterThanOrEqual(10)
          expect(parseFloat(padding)).toBeLessThanOrEqual(12)
        }
        await layout(page, view)
        if (view === 'account') {
          await page.getByRole('textbox', { name: 'First name', exact: true }).fill('')
          await page.getByRole('textbox', { name: 'Last name', exact: true }).fill('')
          await page.getByRole('button', { name: 'Save profile', exact: true }).click()
          await expect(page.getByRole('alert')).toBeVisible()
          await layout(page, 'account-validation')
        }
        chrome.push(await page.evaluate(() => {
          const rail = document.querySelector('.workspace-nav')!.getBoundingClientRect()
          const header = document.querySelector('.workspace-topbar')!.getBoundingClientRect()
          const main = getComputedStyle(document.querySelector('.workspace-main')!)
          return { rail: rail.width, header: header.height, left: main.paddingLeft, right: main.paddingRight }
        }))
      }
      for (const item of chrome) expect(item, 'same chrome across Rescuer pages').toEqual(chrome[0])
      for (const status of ['assigned', 'en-route']) {
        mission.status = status
        await open('overview')
        await expect(page.getByRole('button', { name: status === 'assigned' ? 'ACCEPT MISSION & START TRAVEL' : 'TAP ARRIVED AT SCENE' })).toBeVisible()
        await layout(page, `overview-${status}`)
      }
      mission.status = 'arrived'
      await open('overview')
      const complete = page.getByRole('button', { name: 'TAP RESCUE COMPLETED' })
      await complete.click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      await expect(page.getByRole('button', { name: 'Confirm completion', exact: true })).toBeDisabled()
      await page.getByLabel('Completion details').fill('Synthetic completion note. No status update will be sent.')
      await expect(page.getByRole('button', { name: 'Confirm completion', exact: true })).toBeEnabled()
      for (const label of ['completion', 'end-simulation']) {
        if (label === 'end-simulation') await page.getByRole('button', { name: 'End simulated mission', exact: true }).click()
        const bounds = await dialog.boundingBox()
        expect(Math.abs(bounds!.x + bounds!.width / 2 - viewport.width / 2)).toBeLessThanOrEqual(2)
        expect(bounds!.y).toBeGreaterThanOrEqual(0)
        expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height)
        await layout(page, label)
        if (label === 'completion') {
          await page.getByLabel('Completion details').evaluate(node => { node.style.height = '700px' })
          const primary = page.getByRole('button', { name: 'Confirm completion', exact: true })
          await primary.scrollIntoViewIfNeeded()
          const actionBox = await primary.boundingBox()
          expect(actionBox!.y).toBeGreaterThanOrEqual(0)
          expect(actionBox!.y + actionBox!.height).toBeLessThanOrEqual(viewport.height)
          const closeBox = await page.getByRole('button', { name: 'Close dialog' }).boundingBox()
          expect(closeBox!.y).toBeGreaterThanOrEqual(0)
          await layout(page, 'completion-resized')
        }
        await page.getByRole('button', { name: 'Close dialog' }).focus()
        await page.keyboard.press('Shift+Tab')
        expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true)
        await page.keyboard.press('Escape')
        await expect(dialog).toHaveCount(0)
      }
      await expect(page.getByRole('button', { name: 'End simulated mission', exact: true })).toBeFocused()
      await context.setOffline(true)
      await expect(page.getByText('Cached mission for offline reference. Conditions may have changed since the last sync.')).toBeVisible()
      await layout(page, 'overview-offline-cached')
      await context.setOffline(false)
      for (const nextState of ['empty', 'error', 'loading']) {
        state = nextState
        await open('history')
        if (state === 'empty') await expect(page.getByRole('heading', { name: 'No completed or cancelled missions' })).toBeVisible()
        if (state === 'error') await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible()
        if (state === 'loading') await expect(page.getByRole('status').filter({ hasText: 'Loading mission history' })).toBeVisible()
        await layout(page, `history-${state}`)
        if (state === 'empty') {
          await open('overview')
          await expect(page.getByRole('heading', { name: 'No active assignment', exact: true })).toBeVisible()
          await layout(page, 'overview-empty')
          if (viewport.width >= 1280) {
            const bottom = await page.locator('.workspace-empty').evaluate(node => node.getBoundingClientRect().bottom)
            expect(bottom, 'compact empty overview fits laptop viewport').toBeLessThanOrEqual(viewport.height)
          }
        }
      }
      expect(writes).toBe(0)
      await context.close()
    })
  }
}
