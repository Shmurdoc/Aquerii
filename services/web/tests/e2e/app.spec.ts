import { test, expect } from './fixtures'
import { boardsUrl } from './helpers'

// Phase 0.1 E2E debt: see docs/debt/PHASE_0_1_E2E_DEBT.md
// The whole e2e suite is currently skipped because the SPA does not
// redirect unauthenticated users from /boards to /login, and the
// E2E job uses APP_ENV=production so E2ESeeder is not invoked.
// Re-enable: remove the test.skip()'s below once the SPA has an
// unauthenticated-redirect guard and the e2e job runs E2ESeeder.
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
    const ok = await loginPage.loginWithRetry('test@example.com', 'password123')
    expect(ok).toBeTruthy()
    await expect(page).toHaveURL(/\/(onboarding|boards)/)
  })
})

test.describe('Onboarding', () => {
  test.beforeEach(async ({ loginPage, page }) => {
    await loginPage.loginWithRetry('test@example.com', 'password123')
    await page.waitForURL(/\/(onboarding|boards)/, { timeout: 15000 })
    await page.goto('/onboarding')
  })

  test('shows role selection for user with existing workspace', async ({ page }) => {
    await expect(page.locator('text=What best describes you')).toBeVisible()
  })
})

test.describe('Boards', () => {
  test.beforeEach(async ({ page, loginPage, boardsPage }) => {
    const { loginPage: lp, boardsPage: bp, page: p } = { loginPage, boardsPage, page }
    const ok = await lp.loginWithRetry('test@example.com', 'password123', 5)
    if (!ok) {
      await p.goto(boardsUrl())
      await p.waitForURL(/\/boards/, { timeout: 15000 })
      return
    }
    await p.waitForURL(/\/(onboarding|boards)/, { timeout: 15000 })
    if (p.url().includes('/onboarding')) {
      await p.goto(boardsUrl())
      await p.waitForURL(/\/boards/, { timeout: 10000 })
    }
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
    await loginPage.loginWithRetry('test@example.com', 'password123')
    await page.waitForURL(/\/(onboarding|boards)/, { timeout: 15000 })
    if (page.url().includes('/onboarding')) {
      await page.goto(boardsUrl())
      await page.waitForURL(/\/boards/, { timeout: 10000 })
    }
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
  test('displays pipeline view', async ({ page, loginPage, crmPage }) => {
    await loginPage.loginWithRetry('test@example.com', 'password123')
    await page.waitForURL(/\/(onboarding|boards)/, { timeout: 15000 })
    if (page.url().includes('/onboarding')) {
      await page.goto(boardsUrl())
      await page.waitForURL(/\/boards/, { timeout: 10000 })
    }
    await crmPage.goto()
    await page.waitForLoadState('networkidle')
    await expect(crmPage.stageHeader('Lead')).toBeVisible({ timeout: 10000 })
  })
})
