import { type Page, type Locator } from '@playwright/test'
import { permitsUrl, newPermitUrl, approvalQueueUrl } from '../helpers'

export class PermitPage {
  readonly page: Page
  readonly heading: Locator
  readonly newPermitButton: Locator
  readonly permitCards: Locator
  readonly submitButton: Locator
  readonly continueButton: Locator
  readonly reviewButton: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole('heading', { name: /Permit to Work|Permit Register|Permit Approval Queue|New Permit to Work/ }).first()
    this.newPermitButton = page.getByRole('button', { name: 'New Permit' })
    this.permitCards = page.locator('[class*="cursor-pointer"]').filter({ has: page.locator('[class*="font-mono"]') })
    this.submitButton = page.getByRole('button', { name: 'Submit Permit' })
    this.continueButton = page.getByRole('button', { name: 'Continue' })
    this.reviewButton = page.getByRole('button', { name: 'Review' })
  }

  async goto() {
    await this.page.goto(permitsUrl())
  }

  async gotoNew() {
    await this.page.goto(newPermitUrl())
  }

  async gotoApprovalQueue() {
    await this.page.goto(approvalQueueUrl())
  }

  async selectPermitType(type: string) {
    await this.page.getByRole('button', { name: type, exact: true }).click()
  }

  async selectShaft(shaft: string) {
    await this.page.locator('label').filter({ hasText: 'Shaft' }).locator('..').locator('select').selectOption(shaft)
  }

  async selectLevel(level: string) {
    await this.page.locator('label').filter({ hasText: 'Level' }).locator('..').locator('select').selectOption(level)
  }

  async selectSection(section: string) {
    await this.page.locator('label').filter({ hasText: 'Section' }).locator('..').locator('select').selectOption(section)
  }

  async fillDescription(text: string) {
    await this.page.locator('textarea').first().fill(text)
  }

  async fillHazardDescription(text: string) {
    await this.page.locator('input[placeholder="Describe the hazard"]').first().fill(text)
  }

  async fillControlMeasure(text: string) {
    await this.page.locator('input[placeholder="Control measure"]').first().fill(text)
  }

  async fillWorkMethod(text: string) {
    await this.page.locator('textarea').nth(1).fill(text)
  }

  async selectWorker(name: string) {
    await this.page.locator('text=' + name).first().click()
  }

  async clickContinue() {
    await this.continueButton.click()
  }

  async clickReview() {
    await this.reviewButton.click()
  }

  async clickSubmit() {
    await this.submitButton.click()
  }

  async viewPendingPermit() {
    await this.permitCards.first().click()
  }

  async approvePermit() {
    await this.page.getByRole('button', { name: 'Approve' }).click()
  }

  async getSuccessToast() {
    return this.page.locator('text=Permit created successfully')
  }

  async getApprovalToast() {
    return this.page.locator('text=Permit approved')
  }

  permitReference(index = 0): Locator {
    return this.page.locator('[class*="font-mono"]').nth(index)
  }
}
