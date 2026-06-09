import { test, expect } from './fixtures'

test.describe('Gate Kiosk', () => {

  test('scans a worker badge and displays access result', async ({ page, loginPage, gateKioskPage }) => {
    await loginPage.loginWithRetry('test@example.com', 'password123')
    await page.waitForURL(/\/(onboarding|boards)/, { timeout: 15000 })

    await gateKioskPage.goto()
    await expect(page).toHaveURL(/\/gate/)
    await page.waitForLoadState('networkidle')

    await expect(gateKioskPage.heading).toBeVisible()
    await expect(gateKioskPage.input).toBeVisible()

    await gateKioskPage.scanBadge('WM-001')
    await page.waitForLoadState('networkidle')

    const granted = await gateKioskPage.isAccessGranted()
    const denied = await gateKioskPage.isAccessDenied()
    expect(granted || denied).toBeTruthy()
  })
})
