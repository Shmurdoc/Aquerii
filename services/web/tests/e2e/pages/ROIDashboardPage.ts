import { type Page, type Locator } from '@playwright/test'
import { roiUrl } from '../helpers'

export class ROIDashboardPage {
  readonly page: Page
  readonly heading: Locator
  readonly summaryCards: Locator
  readonly dateRangeSelect: Locator
  readonly exportButton: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole('heading', { name: 'ROI Dashboard' })
    this.summaryCards = page.locator('[class*="grid-cols-4"] [class*="p-4"]')
    this.dateRangeSelect = page.locator('select')
    this.exportButton = page.getByRole('button', { name: /export/i })
  }

  async goto() {
    await this.page.goto(roiUrl())
  }

  async selectDateRange(preset: string) {
    await this.dateRangeSelect.selectOption(preset)
  }

  summaryCard(label: string): Locator {
    return this.page.locator(`text=${label}`).locator('..').locator('p').first()
  }

  async getComplianceRateTrendData(): Promise<Locator> {
    return this.page.locator('text=Compliance Rate Trend')
  }
}
