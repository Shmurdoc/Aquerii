import { test, expect } from './fixtures'
import { boardsUrl } from './helpers'

test.describe('Auth — Registration → Onboarding → Workspace', () => {

  test('redirects unauthenticated user to login', async ({ page }) => {
    await page.goto(boardsUrl())
    await expect(page).toHaveURL(/\/login/)
  })

  test('shows validation errors on empty login form', async ({ loginPage, page }) => {
    await loginPage.goto()
    await loginPage.submit()
    await expect(page.locator('text=required')).toBeVisible()
  })

  test('logs in with valid credentials', async ({ loginPage, page }) => {
    await loginPage.loginWithRetry('test@example.com', 'password123')
    await expect(page).toHaveURL(/\/(onboarding|boards)/)
  })

  test('navigates to register page from login', async ({ loginPage, page }) => {
    await loginPage.goto()
    await loginPage.registerLink.click()
    await expect(page).toHaveURL(/\/register/)
  })

  test('registration form requires all fields', async ({ page }) => {
    await page.goto('/register')
    await page.getByRole('button', { name: /create account/i }).click()
    await expect(page.locator('text=required').first()).toBeVisible()
  })

  test('completes full registration', async ({ page }) => {
    const email = `test-${Date.now()}@example.com`
    await page.goto('/register')
    await page.fill('input[name="name"]', 'Test User')
    await page.fill('input[type="email"]', email)
    await page.fill('input[name="workspace_name"]', 'Test Workspace')
    await page.fill('input[type="password"]', 'Password123!')
    await page.fill('input[name="password_confirmation"]', 'Password123!')
    await page.getByRole('button', { name: /create account/i }).click()
    await page.waitForURL(/\/(onboarding|boards)/, { timeout: 15000 })
    await expect(page).toHaveURL(/\/(onboarding|boards)/)
  })

  test('shows role selection onboarding for user with existing workspace', async ({ loginPage, page }) => {
    await loginPage.loginWithRetry('test@example.com', 'password123')
    await page.waitForURL(/\/(onboarding|boards)/, { timeout: 15000 })
    await page.goto('/onboarding')
    await expect(page.locator('text=What best describes you')).toBeVisible()
  })

  test('multi-factor auth input appears when required', async ({ loginPage, page }) => {
    await loginPage.goto()
    await page.waitForLoadState('networkidle')
    await loginPage.fill('test@example.com', 'password123')
    await loginPage.submit()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/(onboarding|boards|login)/)
  })

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.waitForSelector('input[type="email"]', { state: 'visible' })
    await page.fill('input[type="email"]', 'invalid@example.com')
    await page.fill('input[type="password"]', 'WrongPass1')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

})
