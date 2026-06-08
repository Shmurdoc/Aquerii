import { type Page, type Locator } from '@playwright/test'
import { complianceUrl } from '../helpers'

export class CompliancePage {
  readonly page: Page
  readonly heading: Locator
  readonly summaryCards: Locator
  readonly workerRows: Locator
  readonly workerName: (name: string) => Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole('heading', { name: 'Compliance Dashboard' })
    this.summaryCards = page.locator('[class*="p-4"]').filter({ has: page.locator('[class*="text-2xl"]') })
    this.workerRows = page.locator('[class*="cursor-pointer"]').filter({ has: page.locator('[class*="text-sm font-medium"]') })
    this.workerName = (name: string) => page.locator(`text=${name}`).first()
  }

  async goto() {
    await this.page.goto(complianceUrl())
  }

  summaryCard(label: string): Locator {
    return this.page.locator(`text=${label}`).locator('..').locator('p').first()
  }

  async clickWorkerRow(name: string) {
    await this.workerName(name).click()
  }

  async expandedCertifications(): Promise<Locator> {
    return this.page.locator('text=Certification Details')
  }
}
