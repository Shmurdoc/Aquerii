import { type Page, type Locator } from '@playwright/test'
import { boardsUrl } from '../helpers'

export class BoardsPage {
  readonly page: Page
  readonly heading: Locator
  readonly newBoardButton: Locator
  readonly boardCards: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole('heading', { name: 'Boards' })
    this.newBoardButton = page.getByRole('button', { name: 'New Board' })
    this.boardCards = page.locator('[data-testid="board-card"]')
  }

  async goto() {
    await this.page.goto(boardsUrl())
  }

  boardCard(name: string): Locator {
    return this.boardCards.filter({ hasText: name })
  }

  async createBoard(): Promise<void> {
    await this.newBoardButton.click()
  }

  async openBoard(name?: string): Promise<void> {
    if (name) {
      await this.boardCard(name).click()
    } else {
      await this.boardCards.first().click()
    }
  }
}
