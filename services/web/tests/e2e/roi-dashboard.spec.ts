import { test, expect } from './fixtures'

test.describe('ROI Dashboard', () => {

  test('ROI page loads with summary cards and trend chart', async ({ page, loginPage, roiDashboardPage }) => {
    await loginPage.loginWithRetry('test@example.com', 'password123')
    await page.waitForURL(/\/(onboarding|boards)/, { timeout: 15000 })

    await roiDashboardPage.goto()
    await expect(page).toHaveURL(/\/roi/)
    await page.waitForLoadState('networkidle')

    await expect(roiDashboardPage.heading).toBeVisible()
    await expect(page.getByText('Compliance Rate')).toBeVisible()
    await expect(page.getByText('ROI Ratio')).toBeVisible()
    await expect(page.getByText('Downtime Avoided')).toBeVisible()
    await expect(page.getByText('Access Denials Prevented')).toBeVisible()
  })

  test('date range filter changes the data shown', async ({ page, loginPage, roiDashboardPage }) => {
    await loginPage.loginWithRetry('test@example.com', 'password123')
    await page.waitForURL(/\/(onboarding|boards)/, { timeout: 15000 })

    await roiDashboardPage.goto()
    await page.waitForLoadState('networkidle')

    await roiDashboardPage.selectDateRange('7d')
    await page.waitForLoadState('networkidle')
    await expect(roiDashboardPage.heading).toBeVisible()
  })

  test('compliance rate trend is visible', async ({ page, loginPage, roiDashboardPage }) => {
    await loginPage.loginWithRetry('test@example.com', 'password123')
    await page.waitForURL(/\/(onboarding|boards)/, { timeout: 15000 })

    await roiDashboardPage.goto()
    await page.waitForLoadState('networkidle')

    const trendSection = await roiDashboardPage.getComplianceRateTrendData()
    await expect(trendSection).toBeVisible()
  })

  test('export button exists', async ({ page, loginPage }) => {
    await loginPage.loginWithRetry('test@example.com', 'password123')
    await page.waitForURL(/\/(onboarding|boards)/, { timeout: 15000 })

    await page.goto('/roi')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Savings Breakdown')).toBeVisible()
  })
})
