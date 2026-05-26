import { type Page, type Locator } from '@playwright/test'

export class DocumentPage {
  readonly page: Page
  readonly title: Locator
  readonly editor: Locator

  constructor(page: Page) {
    this.page = page
    this.title = page.locator('h1').first()
    this.editor = page.locator('[contenteditable]').first()
  }
}
