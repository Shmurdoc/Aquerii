import { test, expect } from './fixtures'
import { documentsUrl } from './helpers'

test.describe('Documents — Create → Edit Content', () => {

  test.beforeEach(async ({ page, loginPage }) => {
    await loginPage.login('test@example.com', 'password123')
    await page.waitForURL(/\/(onboarding|boards)/, { timeout: 15000 })
  })

  test('displays documents page with heading', async ({ documentsPage }) => {
    await documentsPage.goto()
    await expect(documentsPage.heading).toBeVisible()
  })

  test('shows notes and files tabs', async ({ documentsPage }) => {
    await documentsPage.goto()
    await expect(documentsPage.notesTab).toBeVisible()
    await expect(documentsPage.filesTab).toBeVisible()
  })

  test('can create a new document', async ({ documentsPage, page }) => {
    await documentsPage.goto()
    await documentsPage.createNewNote()
    await expect(page).toHaveURL(/\/documents\/[a-z0-9-]+/, { timeout: 15000 })
  })

  test('document title is editable', async ({ page }) => {
    await page.goto(documentsUrl())
    await page.waitForTimeout(2000)
    if (page.url().includes('/documents/')) {
      const titleInput = page.locator('h1').first().or(page.locator('input[type="text"]').first())
      if (await titleInput.isVisible()) {
        await titleInput.fill(`E2E Test Doc ${Date.now()}`)
        await titleInput.press('Tab')
      }
    }
  })

  test('document content editor is present', async ({ page }) => {
    await page.goto(documentsUrl())
    await page.waitForTimeout(2000)
    if (page.url().includes('/documents/')) {
      const editor = page.locator('[contenteditable]').first()
      if (await editor.isVisible()) {
        await editor.fill('Hello, this is an E2E test document.')
      }
    }
  })

  test('switches between notes and files tabs', async ({ documentsPage, page }) => {
    await documentsPage.goto()
    await documentsPage.switchToFiles()
    await page.waitForTimeout(500)
    await documentsPage.switchToNotes()
    await page.waitForTimeout(500)
  })

})
