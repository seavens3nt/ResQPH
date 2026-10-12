import { test, expect } from '@playwright/test'

test('built shell, nested refresh, cookie session, CSRF write and account isolation', async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  const base = 'http://127.0.0.1:5175'
  const email = `ci-${Date.now()}@example.test`
  const origin = { Origin: base }
  // Isolated synthetic CI database. Registration is verified through the real proxy.
  const registered = await context.request.post(`${base}/api/v1/auth/register`, {
    headers: origin, data: { name: 'CI Synthetic Citizen', email, password: 'CI-Synthetic-Only-Password-55' },
  })
  expect(registered.status()).toBe(201)
  expect(registered.headers()['cache-control']).toContain('no-store')
  const cookies = await context.cookies()
  expect(cookies.find(cookie => cookie.name === 'resqph_session')?.httpOnly).toBe(true)
  const csrf = cookies.find(cookie => cookie.name === 'resqph_csrf')
  expect(csrf?.httpOnly).toBe(false)
  expect(csrf?.value).toBeTruthy()
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible()
  await page.goto('/dashboard?view=inquiries')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'My Requests', exact: true })).toBeVisible()
  // The router also serves direct nested paths from the built SPA shell.
  await page.goto('/dashboard/direct-refresh-check')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible()
  const rejected = await context.request.patch(`${base}/api/v1/auth/profile`, {
    headers: origin, data: { name: 'CSRF must reject this' },
  })
  expect(rejected.status()).toBe(403)
  const updated = await context.request.patch(`${base}/api/v1/auth/profile`, {
    headers: { ...origin, 'X-CSRF-Token': csrf!.value }, data: { name: 'CI Synthetic Updated' },
  })
  expect(updated.status()).toBe(200)
  const outsider = await browser.newContext()
  const unauthorized = await outsider.request.get(`${base}/api/v1/auth/session`)
  expect(unauthorized.status()).toBe(401)
  const apiMissing = await context.request.get(`${base}/api/v1/not-an-api`)
  expect(apiMissing.status()).toBe(404)
  expect(apiMissing.headers()['content-type']).toContain('application/json')
  await page.goto('/dashboard?view=account')
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  expect((await context.request.get(`${base}/api/v1/auth/session`)).status()).toBe(401)
  await page.goto('/signup')
  await expect(page.getByRole('heading').first()).toBeVisible()
  await outsider.close()
  await context.close()
})
