import { type Page, type Locator } from '@playwright/test'
import { equipmentUrl } from '../helpers'

export class EquipmentListPage {
  readonly page: Page
  readonly heading: Locator
  readonly searchInput: Locator
  readonly addButton: Locator
  readonly equipmentCards: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole('heading', { name: 'Equipment' })
    this.searchInput = page.locator('input[placeholder*="Search by name"]')
    this.addButton = page.getByRole('button', { name: 'Add Equipment' })
    this.equipmentCards = page.locator('[class*="cursor-pointer"]').filter({ has: page.locator('[class*="truncate"]') })
  }

  async goto() {
    await this.page.goto(equipmentUrl())
  }

  async search(query: string) {
    await this.searchInput.fill(query)
  }

  async clickFirstEquipment() {
    await this.equipmentCards.first().click()
  }

  async getEquipmentCount(): Promise<number> {
    return this.equipmentCards.count()
  }
}
