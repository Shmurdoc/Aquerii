import { type Page, type Locator } from '@playwright/test'
import { BASE } from '../helpers'

export class LoginPage {
  readonly page: Page
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly submitButton: Locator
  readonly mfaInput: Locator
  readonly registerLink: Locator

  constructor(page: Page) {
    this.page = page
    this.emailInput = page.locator('input[type="email"]')
    this.passwordInput = page.locator('input[type="password"]')
    this.submitButton = page.getByRole('button', { name: 'Sign in' })
    this.mfaInput = page.getByLabel('MFA Code')
    this.registerLink = page.getByRole('link', { name: 'Create one' })
  }

  async goto() {
    await this.page.goto(`${BASE}/login`)
  }

  async fill(email: string, password: string) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
  }

  async submit() {
    await this.submitButton.click()
  }

  async login(email: string, password: string) {
    await this.goto()
    await this.fill(email, password)
    await this.submit()
  }
}
