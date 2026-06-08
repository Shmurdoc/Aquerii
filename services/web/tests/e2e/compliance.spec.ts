import { test, expect } from './fixtures'

test.describe('Compliance Dashboard', () => {

  test('displays summary cards with compliance stats', async ({ page, loginPage, compliancePage }) => {
    await loginPage.loginWithRetry('test@example.com', 'password123')
    await page.waitForURL(/\/(onboarding|boards)/, { timeout: 15000 })

    await compliancePage.goto()
    await expect(page).toHaveURL(/\/compliance/)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Total Workers')).toBeVisible()
    await expect(page.getByText('Compliant')).toBeVisible()
    await expect(page.getByText('Expiring Soon')).toBeVisible()
    await expect(page.getByText('Non-Compliant')).toBeVisible()
  })

  test('renders worker list with compliance badges and expands details on click', async ({ page, loginPage, compliancePage }) => {
    await loginPage.loginWithRetry('test@example.com', 'password123')
    await page.waitForURL(/\/(onboarding|boards)/, { timeout: 15000 })

    await compliancePage.goto()
    await page.waitForLoadState('networkidle')

    const workerRows = page.locator('button:has([class*="text-sm font-medium"])')
    await expect(workerRows.first()).toBeVisible({ timeout: 10000 })

    const badgeCount = await page.locator('text=Compliant').count()
    expect(badgeCount).toBeGreaterThanOrEqual(1)

    await workerRows.first().click()
    await expect(page.getByText('Certification Details')).toBeVisible({ timeout: 5000 })
  })
})
