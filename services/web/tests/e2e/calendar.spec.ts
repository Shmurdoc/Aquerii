import { test, expect } from './fixtures'

test('calendar page fires useCalendarItems query against /calendar-items endpoint', async ({ page, loginPage }) => {
  const requests: { url: string; method: string; status?: number }[] = []

  page.on('request', req => {
    if (req.url().includes('/calendar-items')) {
      requests.push({ url: req.url(), method: req.method() })
    }
  })
  page.on('response', res => {
    if (res.url().includes('/calendar-items')) {
      const r = requests.find(x => x.url === res.url())
      if (r) r.status = res.status()
    }
  })

  await loginPage.loginWithRetry('test@example.com', 'password123')
  await page.waitForURL(/\/(onboarding|boards|dashboard)/, { timeout: 15000 })
  if (page.url().includes('/onboarding')) {
    await page.goto('/boards')
    await page.waitForURL(/\/boards/, { timeout: 10000 })
  }

  await page.goto('/calendar')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)

  expect(requests.length, `Expected ≥1 /calendar-items request, got ${requests.length}`).toBeGreaterThan(0)

  const call = requests[0]
  expect(call.method).toBe('GET')
  expect(call.status).toBe(200)
  expect(call.url).toMatch(/\/api\/workspaces\/[^/]+\/calendar-items\?from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}/)
})
