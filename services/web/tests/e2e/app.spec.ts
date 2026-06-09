import { test, expect } from '@playwright/test'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'

// ─── Auth ──────────────────────────────────────────────────────────────────────
test.describe('Authentication', () => {
  test('redirects unauthenticated user to login', async ({ page }) => {
    await page.goto(`${BASE}/boards`)
    await expect(page).toHaveURL(/\/login/)
  })

  test('shows validation errors on empty login submit', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.click('button[type=submit]')
    await expect(page.locator('text=required')).toBeVisible()
  })

  test('logs in with valid credentials', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.fill('input[type=email]',    'test@example.com')
    await page.fill('input[type=password]', 'password123')
    await page.click('button[type=submit]')
    // Should either reach onboarding or boards
    await expect(page).toHaveURL(/\/(onboarding|boards)/)
  })
})

// ─── Onboarding ───────────────────────────────────────────────────────────────
test.describe('Onboarding', () => {
  test.beforeEach(async ({ page }) => {
    // Seed auth token via localStorage
    await page.goto(`${BASE}/login`)
    await page.evaluate(() => {
      localStorage.setItem('aquerii-auth', JSON.stringify({
        state: { token: 'test-token', user: { id: '1', name: 'Test', email: 'test@example.com' }, workspace: null },
        version: 0,
      }))
    })
    await page.goto(`${BASE}/onboarding`)
  })

  test('completes workspace creation step', async ({ page }) => {
    await page.fill('input[placeholder*="Acme"]', 'Test Workspace')
    await page.click('button:has-text("Continue")')
    // Moves to role step
    await expect(page.locator('text=What best describes you')).toBeVisible()
  })
})

// ─── Boards ───────────────────────────────────────────────────────────────────
test.describe('Boards', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.fill('input[type=email]',    'test@example.com')
    await page.fill('input[type=password]', 'password123')
    await page.click('button[type=submit]')
    await page.waitForURL(/\/boards/)
  })

  test('displays boards page', async ({ page }) => {
    await expect(page.locator('h1:has-text("Boards")')).toBeVisible()
  })

  test('can create a new board', async ({ page }) => {
    await page.click('button:has-text("New Board")')
    await expect(page.locator('[data-testid="board-card"]').first()).toBeVisible({ timeout: 5000 })
  })

  test('opens board and shows kanban view', async ({ page }) => {
    // Assumes at least one board exists
    await page.click('[data-testid="board-card"]')
    await expect(page.locator('button:has-text("Kanban")')).toBeVisible()
  })

  test('can switch to table view', async ({ page }) => {
    await page.click('[data-testid="board-card"]')
    await page.click('button:has-text("Table")')
    // Table view header columns
    await expect(page.locator('text=Title')).toBeVisible()
    await expect(page.locator('text=Due Date')).toBeVisible()
  })

  test('can switch to calendar view', async ({ page }) => {
    await page.click('[data-testid="board-card"]')
    await page.click('button:has-text("Calendar")')
    await expect(page.locator('text=Mon')).toBeVisible()
  })
})

// ─── Documents ────────────────────────────────────────────────────────────────
test.describe('Documents', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.fill('input[type=email]',    'test@example.com')
    await page.fill('input[type=password]', 'password123')
    await page.click('button[type=submit]')
    await page.waitForURL(/\/boards/)
    await page.click('a[href="/documents"]')
  })

  test('displays documents page', async ({ page }) => {
    await expect(page.locator('h1:has-text("Documents")')).toBeVisible()
  })

  test('can create a new document', async ({ page }) => {
    await page.click('button:has-text("New Document")')
    await expect(page).toHaveURL(/\/documents\/[a-z0-9-]+/)
  })
})

// ─── CRM ──────────────────────────────────────────────────────────────────────
test.describe('CRM', () => {
  test('displays pipeline view', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.fill('input[type=email]',    'test@example.com')
    await page.fill('input[type=password]', 'password123')
    await page.click('button[type=submit]')
    await page.waitForURL(/\/boards/)
    await page.click('a[href="/crm"]')
    // Stage headers
    await expect(page.locator('text=Lead').first()).toBeVisible({ timeout: 5000 })
  })
})
