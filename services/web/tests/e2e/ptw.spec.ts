import { test, expect } from './fixtures'

test.describe('PTW — Permit to Work', () => {

  test('creates a new permit through all 4 steps', async ({ page, loginPage, permitPage }) => {
    await loginPage.loginWithRetry('test@example.com', 'password123')
    await page.waitForURL(/\/(onboarding|boards)/, { timeout: 15000 })

    await permitPage.gotoNew()
    await expect(page).toHaveURL(/\/ptw\/permits\/new/)

    // Step 1: Type & Location
    await expect(page.getByText('Permit Type')).toBeVisible()
    await permitPage.selectPermitType('Hot Work')
    await page.getByLabel('Shaft').selectOption('Shaft 1')
    await page.getByLabel('Level').selectOption('Level 2')
    await page.getByLabel('Section').selectOption('Section A')
    await permitPage.clickContinue()

    // Step 2: Work Details
    await expect(page.getByText('Work Description')).toBeVisible()
    const desc = 'Install new ventilation ducting along the main access drift at Level 2 Shaft 1 Section A. This involves mounting support brackets, connecting duct sections, and sealing joints per Aquerii ventilation standard.'
    await page.getByLabel('Describe the work to be performed').fill(desc)
    await page.locator('input[placeholder="Describe the hazard"]').first().fill('Working at height near open shaft')
    await page.locator('input[placeholder="Control measure"]').first().fill('Full body harness with double lanyard, guardrails, and safety observer')
    await page.locator('textarea').nth(1).fill('Step 1: Isolate area. Step 2: Erect guardrails. Step 3: Install brackets. Step 4: Connect duct sections.')
    await permitPage.clickContinue()

    // Step 3: Workers
    await expect(page.getByText('Assign Workers')).toBeVisible()
    await page.locator('text=John Mokoena').first().click()
    await page.locator('text=Thabo Ndlovu').first().click()
    await permitPage.clickReview()

    // Step 4: Review & Submit
    await expect(page.getByText('Review Permit')).toBeVisible()
    await permitPage.clickSubmit()

    await expect(permitPage.getSuccessToast()).toBeVisible({ timeout: 10000 })
    await expect(page).toHaveURL(/\/ptw\/permits$/)
  })

  test('displays newly created permit in the register', async ({ page, loginPage, permitPage }) => {
    await loginPage.loginWithRetry('test@example.com', 'password123')
    await page.waitForURL(/\/(onboarding|boards)/, { timeout: 15000 })

    await permitPage.goto()
    await expect(page).toHaveURL(/\/ptw\/permits/)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Hot Work')).toBeVisible({ timeout: 10000 })
  })

  test('approves a pending permit as HSSE lead', async ({ page, loginPage, permitPage }) => {
    await loginPage.loginWithRetry('test@example.com', 'password123')
    await page.waitForURL(/\/(onboarding|boards)/, { timeout: 15000 })

    await permitPage.gotoApprovalQueue()
    await expect(page).toHaveURL(/\/ptw\/approval-queue/)
    await page.waitForLoadState('networkidle')

    const pendingCards = page.locator('text=requested')
    if (await pendingCards.count() > 0) {
      await page.locator('text=requested').first().click()
      await page.waitForLoadState('networkidle')

      const approveBtn = page.getByRole('button', { name: 'Approve' })
      await expect(approveBtn).toBeVisible({ timeout: 10000 })
      await approveBtn.click()

      await expect(permitPage.getApprovalToast()).toBeVisible({ timeout: 10000 })
    } else {
      test.skip('No pending permits to approve')
    }
  })
})
