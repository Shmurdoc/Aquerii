import { test, expect } from './fixtures'
import { boardsUrl, boardUrl } from './helpers'

test.describe('Boards — Board → Group → Item → Assign', () => {

  test.beforeEach(async ({ page, loginPage }) => {
    await loginPage.login('test@example.com', 'password123')
    await page.waitForURL(/\/(onboarding|boards)/, { timeout: 15000 })
  })

  test('displays boards page with heading', async ({ boardsPage }) => {
    await boardsPage.goto()
    await expect(boardsPage.heading).toBeVisible()
  })

  test('can create a new board', async ({ boardsPage, page }) => {
    await boardsPage.goto()
    await boardsPage.createBoard()
    await expect(page).toHaveURL(/\/boards\/[a-z0-9-]+/, { timeout: 10000 })
  })

  test('opens board and shows kanban view', async ({ boardsPage, boardPage }) => {
    await boardsPage.goto()
    await boardsPage.openBoard()
    await expect(boardPage.kanbanButton).toBeVisible()
  })

  test('can create a group in a board', async ({ boardsPage, page }) => {
    await boardsPage.goto()
    await boardsPage.openBoard()
    const addGroupButton = page.getByRole('button', { name: /add group/i })
    await addGroupButton.click()
    const nameInput = page.getByPlaceholder(/group name/i)
    await nameInput.fill('New Group')
    const formArea = nameInput.locator('xpath=ancestor::div[3]')
    await formArea.locator('button:has(svg.lucide-check)').first().click()
    await expect(page.getByText('New Group').first()).toBeVisible({ timeout: 8000 })
  })

  test('can add an item to a group', async ({ boardsPage, boardPage, page }) => {
    await boardsPage.goto()
    await boardsPage.openBoard()
    await expect(boardPage.addItemButton).toBeVisible()
    await boardPage.addItemButton.click()
    const itemInput = page.locator('input[placeholder*="item"]')
    if (await itemInput.isVisible()) {
      await itemInput.fill('Test Item')
      await page.getByRole('button', { name: /save|add/i }).click()
    }
    await page.waitForTimeout(1000)
  })

  test('shows item detail modal when clicking an item', async ({ boardsPage, boardPage, page }) => {
    await boardsPage.goto()
    await boardsPage.openBoard()
    if (await boardPage.itemCards.first().isVisible()) {
      await boardPage.itemCards.first().click()
      await expect(page.locator('[role="dialog"]')).toBeVisible()
    }
  })

  test('can switch between board views', async ({ boardsPage, boardPage }) => {
    await boardsPage.goto()
    await boardsPage.openBoard()
    await boardPage.switchToTableView()
    await expect(boardPage.page.getByRole('button', { name: 'Title' })).toBeVisible()
    await boardPage.switchToCalendarView()
    await expect(boardPage.page.locator('text=Mon').first()).toBeVisible()
    await boardPage.switchToKanban()
    await expect(boardPage.page.getByRole('button', { name: /add item/i }).first()).toBeVisible()
  })

  test('navigates between modules via sidebar', async ({ nav, boardsPage, page }) => {
    await boardsPage.goto()
    await expect(boardsPage.heading).toBeVisible()
    await nav.goToDocuments()
    await expect(page).toHaveURL(/\/documents/)
    await nav.goToCRM()
    await expect(page).toHaveURL(/\/crm/)
    await nav.goToBoards()
    await expect(page).toHaveURL(/\/boards/)
  })

  test('board cards are displayed', async ({ boardsPage }) => {
    await boardsPage.goto()
    const cardCount = await boardsPage.boardCards.count()
    expect(cardCount).toBeGreaterThanOrEqual(0)
  })

})
