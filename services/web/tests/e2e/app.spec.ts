import { test, expect } from './fixtures'
import { boardsUrl } from './helpers'

async function loginAndGoToBoards(test: {
  loginPage: any; boardsPage: any; page: any
}) {
  const { loginPage, boardsPage, page } = test
  await loginPage.login('test@example.com', 'password123')
  await page.waitForURL(/\/(onboarding|boards)/, { timeout: 15000 })
  if (page.url().includes('/onboarding')) {
    await page.goto(boardsUrl())
    await page.waitForURL(/\/boards/, { timeout: 10000 })
  }
}

test.describe('Authentication', () => {
  test('redirects unauthenticated user to login', async ({ page }) => {
    await page.goto(boardsUrl())
    await expect(page).toHaveURL(/\/login/)
  })

  test('shows validation errors on empty login submit', async ({ loginPage, page }) => {
    await loginPage.goto()
    await loginPage.submit()
    await expect(page.locator('text=required')).toBeVisible()
  })

  test('logs in with valid credentials', async ({ loginPage, page }) => {
    await loginPage.login('test@example.com', 'password123')
    await expect(page).toHaveURL(/\/(onboarding|boards)/)
  })
})

test.describe('Onboarding', () => {
  test.beforeEach(async ({ loginPage, page }) => {
    await loginPage.login('test@example.com', 'password123')
    await page.waitForURL(/\/(onboarding|boards)/, { timeout: 15000 })
    await page.goto(`${process.env.BASE_URL ?? 'http://localhost:3000'}/onboarding`)
  })

  test('completes workspace creation step', async ({ page }) => {
    await page.fill('input[placeholder*="Acme"]', 'Test Workspace')
    await page.click('button:has-text("Continue")')
    await expect(page.locator('text=What best describes you')).toBeVisible()
  })
})

test.describe('Boards', () => {
  test.beforeEach(async ({ page, loginPage, boardsPage }) => {
    await loginAndGoToBoards({ loginPage, boardsPage, page })
  })

  test('displays boards page', async ({ boardsPage }) => {
    await expect(boardsPage.heading).toBeVisible()
  })

  test('can create a new board', async ({ boardsPage, page }) => {
    await boardsPage.createBoard()
    await expect(page).toHaveURL(/\/boards\/[a-z0-9-]+/, { timeout: 10000 })
  })

  test('opens board and shows kanban view', async ({ boardsPage, boardPage }) => {
    await boardsPage.openBoard()
    await expect(boardPage.kanbanButton).toBeVisible()
  })

  test('can switch to table view', async ({ boardsPage, boardPage }) => {
    await boardsPage.openBoard()
    await boardPage.switchToTableView()
    await expect(boardPage.page.locator('text=Title')).toBeVisible()
    await expect(boardPage.page.locator('text=Due Date')).toBeVisible()
  })

  test('can switch to calendar view', async ({ boardsPage, boardPage }) => {
    await boardsPage.openBoard()
    await boardPage.switchToCalendarView()
    await expect(boardPage.page.locator('text=Mon')).toBeVisible()
  })

  test('navigates between pages via sidebar', async ({ nav, boardsPage, page }) => {
    await expect(boardsPage.heading).toBeVisible()
    await nav.goToDocuments()
    await expect(page).toHaveURL(/\/documents/)
    await nav.goToCRM()
    await expect(page).toHaveURL(/\/crm/)
    await nav.goToBoards()
    await expect(page).toHaveURL(/\/boards/)
  })
})

test.describe('Documents', () => {
  test.beforeEach(async ({ page, loginPage, boardsPage, documentsPage }) => {
    await loginAndGoToBoards({ loginPage, boardsPage, page })
    await documentsPage.goto()
  })

  test('displays documents page', async ({ documentsPage }) => {
    await expect(documentsPage.heading).toBeVisible()
  })

  test('can create a new document', async ({ documentsPage, page }) => {
    await documentsPage.createNewNote()
    await expect(page).toHaveURL(/\/documents\/[a-z0-9-]+/)
  })
})

test.describe('CRM', () => {
  test('displays pipeline view', async ({ page, loginPage, boardsPage, crmPage }) => {
    await loginAndGoToBoards({ loginPage, boardsPage, page })
    await crmPage.goto()
    await expect(crmPage.stageHeader('Lead')).toBeVisible({ timeout: 5000 })
  })
})
