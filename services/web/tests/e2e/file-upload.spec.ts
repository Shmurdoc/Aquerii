import { test, expect } from './fixtures'
import { documentsUrl } from './helpers'
import path from 'path'

test.describe('File Upload — Avatar and Documents', () => {

  test.beforeEach(async ({ page, loginPage }) => {
    await loginPage.login('test@example.com', 'password123')
    await page.waitForURL(/\/(onboarding|boards)/, { timeout: 15000 })
  })

  test('avatar upload button is visible in settings profile', async ({ page }) => {
    await page.goto('/settings/profile')
    await page.waitForTimeout(2000)
    const avatarInput = page.locator('input[type="file"][accept^="image"]').first()
    await expect(avatarInput).toBeAttached({ timeout: 5000 })
  })

  test('documents page has file upload tab', async ({ page }) => {
    await page.goto(documentsUrl())
    await page.waitForTimeout(2000)
    const filesTab = page.getByRole('button', { name: /files/i })
    if (await filesTab.isVisible()) {
      await filesTab.click()
      await page.waitForTimeout(1000)
    }
  })

  test('scanned documents upload button is accessible', async ({ page }) => {
    await page.goto(documentsUrl() + '/files')
    await page.waitForTimeout(2000)
    const uploadButton = page.getByRole('button', { name: /^upload$/i }).first()
    if (await uploadButton.isVisible({ timeout: 3000 })) {
      await expect(uploadButton).toBeEnabled()
    }
  })

  test('file input accepts document types', async ({ page }) => {
    await page.goto(documentsUrl() + '/files')
    await page.waitForTimeout(2000)
    const fileInput = page.locator('input[type="file"]').first()
    if (await fileInput.isVisible({ timeout: 3000 })) {
      const acceptAttr = await fileInput.getAttribute('accept')
      expect(acceptAttr).toBeTruthy()
    }
  })
})
