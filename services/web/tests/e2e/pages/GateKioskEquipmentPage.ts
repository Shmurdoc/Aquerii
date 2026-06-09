import { type Page, type Locator } from '@playwright/test'
import { gateKioskUrl } from '../helpers'

export class GateKioskEquipmentPage {
  readonly page: Page
  readonly equipmentTab: Locator
  readonly input: Locator
  readonly scanButton: Locator
  readonly resultTitle: Locator
  readonly scanEquipmentTab: Locator

  constructor(page: Page) {
    this.page = page
    this.equipmentTab = page.getByRole('tab', { name: /equipment/i })
    this.scanEquipmentTab = page.getByRole('tab', { name: /scan equipment/i })
    this.input = page.locator('input[placeholder*="Registration"]')
    this.scanButton = page.getByRole('button', { name: /verify|scan/i })
    this.resultTitle = page.locator('[class*="text-2xl font-bold"]')
  }

  async goto() {
    await this.page.goto(gateKioskUrl())
  }

  async switchToEquipmentTab() {
    await this.equipmentTab.click()
  }

  async enterRegistration(reg: string) {
    await this.input.fill(reg)
  }

  async clickScan() {
    await this.scanButton.click()
  }

  async scanEquipment(registrationNumber: string) {
    await this.switchToEquipmentTab()
    await this.enterRegistration(registrationNumber)
    await this.clickScan()
  }

  async getResultText(): Promise<string> {
    return (await this.resultTitle.textContent()) ?? ''
  }

  async isCompliant(): Promise<boolean> {
    const text = await this.getResultText()
    return text.includes('COMPLIANT')
  }

  async getNonComplianceReasons(): Promise<Locator> {
    return this.page.locator('text=Non-Compliance Details')
  }
}
