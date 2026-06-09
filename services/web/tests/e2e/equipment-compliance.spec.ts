import { test, expect } from './fixtures'

test.describe('Equipment Compliance', () => {

  test('equipment list page loads with search and filters', async ({ page, loginPage, equipmentListPage }) => {
    await loginPage.loginWithRetry('test@example.com', 'password123')
    await page.waitForURL(/\/(onboarding|boards)/, { timeout: 15000 })

    await equipmentListPage.goto()
    await expect(page).toHaveURL(/\/equipment/)
    await page.waitForLoadState('networkidle')

    await expect(equipmentListPage.heading).toBeVisible()
    await expect(equipmentListPage.searchInput).toBeVisible()
    await expect(equipmentListPage.addButton).toBeVisible()

    const count = await equipmentListPage.getEquipmentCount()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('equipment detail page shows compliance breakdown', async ({ page, loginPage, equipmentListPage, equipmentDetailPage }) => {
    await loginPage.loginWithRetry('test@example.com', 'password123')
    await page.waitForURL(/\/(onboarding|boards)/, { timeout: 15000 })

    await equipmentListPage.goto()
    await page.waitForLoadState('networkidle')

    const count = await equipmentListPage.getEquipmentCount()
    if (count === 0) {
      test.skip('no equipment data available')
      return
    }

    await equipmentListPage.clickFirstEquipment()
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/equipment\/[a-z0-9-]+/)
    await expect(equipmentDetailPage.complianceSection).toBeVisible()
    await expect(page.getByText('Cert Breakdown')).toBeVisible()
    await expect(page.getByText('Certification Records')).toBeVisible()
  })

  test('gate kiosk equipment scan tab works', async ({ page, loginPage, gateKioskEquipmentPage }) => {
    await loginPage.loginWithRetry('test@example.com', 'password123')
    await page.waitForURL(/\/(onboarding|boards)/, { timeout: 15000 })

    await gateKioskEquipmentPage.goto()
    await expect(page).toHaveURL(/\/gate/)
    await page.waitForLoadState('networkidle')

    await gateKioskEquipmentPage.switchToEquipmentTab()
    await expect(gateKioskEquipmentPage.input).toBeVisible()

    await gateKioskEquipmentPage.scanEquipment('CR-2024-001')
    await page.waitForLoadState('networkidle')

    const compliant = await gateKioskEquipmentPage.isCompliant()
    const reasons = await gateKioskEquipmentPage.getNonComplianceReasons()
    expect(compliant || await reasons.isVisible()).toBeTruthy()
  })
})
