import { type Page, type Locator } from '@playwright/test'

export class BoardPage {
  readonly page: Page
  readonly kanbanButton: Locator
  readonly tableViewButton: Locator
  readonly calendarViewButton: Locator
  readonly whiteboardButton: Locator
  readonly addItemButton: Locator
  readonly itemCards: Locator

  constructor(page: Page) {
    this.page = page
    this.kanbanButton = page.getByRole('button', { name: 'Kanban' })
    this.tableViewButton = page.getByRole('button', { name: 'Table' })
    this.calendarViewButton = page.getByRole('button', { name: 'Calendar' })
    this.whiteboardButton = page.getByRole('button', { name: 'Whiteboard' })
    this.addItemButton = page.getByRole('button', { name: 'Add item' }).first()
    this.itemCards = page.locator('div.bg-gray-800.border.border-gray-700')
  }

  async switchToKanban() {
    await this.kanbanButton.waitFor({ state: 'visible', timeout: 15000 })
    await this.kanbanButton.click()
  }

  async switchToTableView() {
    await this.tableViewButton.waitFor({ state: 'visible', timeout: 15000 })
    await this.tableViewButton.click()
  }

  async switchToCalendarView() {
    await this.calendarViewButton.waitFor({ state: 'visible', timeout: 15000 })
    await this.calendarViewButton.click()
  }

  async switchToWhiteboard() {
    await this.whiteboardButton.waitFor({ state: 'visible', timeout: 15000 })
    await this.whiteboardButton.click()
  }
}
