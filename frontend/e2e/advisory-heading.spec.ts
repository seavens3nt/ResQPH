import { test, expect } from '@playwright/test'

test.use({ channel: process.env.RESQPH_TEST_BROWSER_CHANNEL })

for (const width of [1440, 390]) {
  for (const theme of ['light', 'dark'] as const) {
    test(`Advisory shares section-heading typography ${width}px ${theme}`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: 'reduce' })
      const page = await context.newPage()
      // Synthetic presentation only; no real sessions or database writes.
      await page.route('**/api/v1/**', route => route.fulfill(
        new URL(route.request().url()).pathname.endsWith('/auth/session')
          ? { json: { user: { id: 'heading-test', name: 'Synthetic Heading Test', email: 'heading@example.test', role: 'citizen' } } }
          : { status: 503, json: { error: { code: 'fixture_unavailable', message: 'Presentation fixture only.' } } },
      ))
      const typography = async (name: string) => page.getByRole('heading', { name, level: 2, exact: true }).evaluate(node => {
        const style = getComputedStyle(node)
        return { fontSize: style.fontSize, fontWeight: style.fontWeight, fontFamily: style.fontFamily, lineHeight: style.lineHeight, letterSpacing: style.letterSpacing, gap: style.gap, color: style.color }
      })
      await page.goto('/dashboard?view=help')
      await expect(page.getByRole('heading', { name: 'Help & Limitations', level: 2 })).toBeVisible()
      const reference = await typography('Help & Limitations')
      await page.goto('/dashboard?view=advisory')
      const heading = page.getByRole('heading', { name: 'Weather advisory', level: 2, exact: true })
      await expect(heading).toBeVisible()
      expect(await typography('Weather advisory')).toEqual(reference)
      const icon = heading.locator(':scope > svg')
      await expect(icon).toBeVisible()
      await expect(icon).toHaveAttribute('aria-hidden', 'true')
      const iconBox = await icon.boundingBox()
      const labelBox = await heading.locator(':scope > span').boundingBox()
      expect(iconBox!.x + iconBox!.width).toBeLessThan(labelBox!.x)
      await context.close()
    })
  }
}
