import { type Page, type Locator } from '@playwright/test'
import { gateKioskUrl } from '../helpers'

export class GateKioskPage {
  readonly page: Page
  readonly heading: Locator
  readonly input: Locator
  readonly scanButton: Locator
  readonly resultTitle: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole('heading', { name: 'Site Access Gate' })
    this.input = page.locator('input[placeholder*="Worker ID"]')
    this.scanButton = page.getByRole('button', { name: 'Verify Access' })
    this.resultTitle = page.locator('[class*="text-2xl font-bold"]')
  }

  async goto() {
    await this.page.goto(gateKioskUrl())
  }

  async enterBadgeId(badgeId: string) {
    await this.input.fill(badgeId)
  }

  async clickScan() {
    await this.scanButton.click()
  }

  async scanBadge(badgeId: string) {
    await this.enterBadgeId(badgeId)
    await this.clickScan()
  }

  async getResultText(): Promise<string> {
    return (await this.resultTitle.textContent()) ?? ''
  }

  async isAccessGranted(): Promise<boolean> {
    const text = await this.getResultText()
    return text.includes('ACCESS GRANTED')
  }

  async isAccessDenied(): Promise<boolean> {
    const text = await this.getResultText()
    return text.includes('ACCESS DENIED')
  }

  async getNonComplianceReasons(): Promise<Locator> {
    return this.page.locator('text=Non-Compliance Details')
  }
}
