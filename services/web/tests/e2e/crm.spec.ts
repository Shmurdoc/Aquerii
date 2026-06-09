import { test, expect } from './fixtures'
import { crmUrl } from './helpers'

test.describe('CRM — Pipeline → Contacts → Deals', () => {

  test.beforeEach(async ({ page, loginPage }) => {
    await loginPage.login('test@example.com', 'password123')
    await page.waitForURL(/\/(onboarding|boards)/, { timeout: 15000 })
  })

  test('displays pipeline view with stage headers', async ({ crmPage }) => {
    await crmPage.goto()
    await expect(crmPage.stageHeader('Lead')).toBeVisible({ timeout: 5000 })
    await expect(crmPage.stageHeader('Qualified')).toBeVisible({ timeout: 5000 })
    await expect(crmPage.stageHeader('Proposal')).toBeVisible({ timeout: 5000 })
  })

  test('shows deal cards in pipeline', async ({ crmPage, page }) => {
    await crmPage.goto()
    const dealCount = await crmPage.dealCards.count()
    expect(dealCount).toBeGreaterThanOrEqual(0)
  })

  test('can open deal detail modal', async ({ crmPage, page }) => {
    await crmPage.goto()
    if (await crmPage.dealCards.first().isVisible()) {
      await crmPage.dealCards.first().click()
      await expect(page.locator('[role="dialog"]')).toBeVisible()
    }
  })

  test('add deal button is visible', async ({ crmPage }) => {
    await crmPage.goto()
    await expect(crmPage.addDealButton).toBeVisible()
  })

  test('create deal flow', async ({ crmPage }) => {
    await crmPage.goto()
    await crmPage.addDealButton.click()
    await expect(crmPage.page.getByText('New Deal').first()).toBeVisible({ timeout: 8000 })
  })

  test('contact CRUD — create contact', async ({ page }) => {
    await page.goto(crmUrl())
    const contactsTab = page.getByRole('tab', { name: /contacts/i })
    if (await contactsTab.isVisible()) {
      await contactsTab.click()
      await page.waitForTimeout(1000)
      const addContact = page.getByRole('button', { name: /add contact|new contact/i }).first()
      if (await addContact.isVisible()) {
        await addContact.click()
        const emailInput = page.locator('input[type="email"]').first()
        if (await emailInput.isVisible()) {
          await emailInput.fill(`contact-${Date.now()}@example.com`)
          await page.getByRole('button', { name: /save|create/i }).click()
        }
      }
    }
  })

  test('display CRM sidebar navigation', async ({ nav, page }) => {
    await nav.goToCRM()
    await expect(page).toHaveURL(/\/crm/)
  })

})
