import { type Page, type Locator } from '@playwright/test'

export class EquipmentDetailPage {
  readonly page: Page
  readonly heading: Locator
  readonly backButton: Locator
  readonly editButton: Locator
  readonly deleteButton: Locator
  readonly addCertButton: Locator
  readonly complianceSection: Locator
  readonly certTable: Locator
  readonly certBreakdown: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.locator('h1')
    this.backButton = page.locator('button:has(svg.lucide-arrow-left)')
    this.editButton = page.getByRole('button', { name: /edit/i })
    this.deleteButton = page.getByRole('button', { name: /delete/i })
    this.addCertButton = page.getByRole('button', { name: /add cert/i })
    this.complianceSection = page.locator('text=Compliance Status').locator('..')
    this.certTable = page.locator('table')
    this.certBreakdown = page.locator('text=Cert Breakdown').locator('..')
  }

  async goto(equipmentId: string) {
    await this.page.goto(`/equipment/${equipmentId}`)
  }

  async addCertRecord() {
    await this.addCertButton.click()
  }

  async clickEdit() {
    await this.editButton.click()
  }

  async clickDelete() {
    await this.deleteButton.click()
  }

  async getComplianceStatus(): Promise<string | null> {
    return this.complianceSection.locator('[class*="text-lg font-bold"]').textContent()
  }

  async getCertRowCount(): Promise<number> {
    return this.certTable.locator('tbody tr').count()
  }
}
