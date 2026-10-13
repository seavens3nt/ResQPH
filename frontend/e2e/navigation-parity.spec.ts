import { test, expect } from '@playwright/test'

// Local verification can use installed Chrome; CI uses pinned Chromium.
test.use({ channel: process.env.RESQPH_TEST_BROWSER_CHANNEL })

// Isolated presentation fixtures: no hosted accounts or database writes.
for (const view of ['overview', 'account']) {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
    for (const theme of ['light', 'dark']) {
      for (const collapsed of [false, true]) {
        test(`navigation parity ${view} ${viewport.width}px ${theme} collapsed=${collapsed}`, async ({ browser }) => {
          const snapshots: Record<string, unknown>[] = []
          for (const role of ['citizen', 'rescuer']) {
            const context = await browser.newContext({ viewport, colorScheme: theme as 'light' | 'dark', reducedMotion: 'reduce' })
            const page = await context.newPage()
            await page.route('**/api/v1/**', async route => {
              if (new URL(route.request().url()).pathname.endsWith('/auth/session')) {
                await route.fulfill({ json: { user: { id: `navbar-${role}`, name: 'Synthetic Navbar Test', email: `${role}@example.test`, role } } })
              } else {
                await route.fulfill({ status: 503, json: { error: { code: 'fixture_unavailable', message: 'Presentation fixture only.' } } })
              }
            })
            await page.goto(`/dashboard?view=${view}`)
            const sidebar = page.locator('.workspace-nav')
            await expect(sidebar).toBeVisible()
            if (collapsed) {
              await sidebar.focus()
              await page.keyboard.press('Enter')
            }
            await expect(page.locator('.workspace-shell')).toHaveAttribute('data-nav-collapsed', String(collapsed))
            await expect(page.locator('.workspace-shell')).toHaveAttribute('data-theme', theme)
            await page.evaluate(() => document.fonts.ready)
            snapshots.push(await sidebar.evaluate((node, desktop) => {
              const read = (element: Element, geometry = false, pseudo?: string) => {
                const style = getComputedStyle(element, pseudo)
                const properties = ['backgroundColor', 'color', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft', 'borderRadius', 'boxShadow', 'padding', 'gap', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'alignItems', 'justifyContent', 'flexDirection', 'opacity', 'filter']
                if (geometry) properties.push('width', 'height', 'minHeight', 'margin', 'top')
                return Object.fromEntries(properties.map(key => [key, style[key as keyof CSSStyleDeclaration]]))
              }
              const active = node.querySelector('nav button[aria-current]')!
              const inactive = node.querySelector('nav button:not([aria-current])')!
              return {
                sidebar: read(node, desktop),
                brand: read(node.querySelector('.workspace-brand')!, true),
                nav: read(node.querySelector('nav')!),
                active: read(active, desktop),
                marker: read(active, false, '::before'),
                inactive: read(inactive, desktop),
                label: read(active.querySelector('.workspace-nav-label')!),
                icon: read(active.querySelector('.figma-home-asset')!, true),
                help: read(node.querySelector(':scope > button')!, desktop),
              }
            }, viewport.width > 850))
            if (view === 'overview' && viewport.width === 1440 && theme === 'light' && !collapsed) {
              await sidebar.screenshot({ path: test.info().outputPath(`${role}-navbar.png`) })
            }
            await context.close()
          }
          expect(snapshots[1]).toEqual(snapshots[0])
        })
      }
    }
  }
}
