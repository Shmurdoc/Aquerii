import { type Page, type Locator } from '@playwright/test'
import { crmUrl } from '../helpers'

export class CRMPage {
  readonly page: Page
  readonly dealCards: Locator
  readonly addDealButton: Locator

  constructor(page: Page) {
    this.page = page
    this.dealCards = page.locator('[role="button"]').filter({ hasText: /./ })
    this.addDealButton = page.getByRole('button', { name: /Add deal/i }).first()
  }

  async goto() {
    await this.page.goto(crmUrl())
  }

  stageHeader(name: string): Locator {
    return this.page.getByText(name, { exact: false }).first()
  }
}
