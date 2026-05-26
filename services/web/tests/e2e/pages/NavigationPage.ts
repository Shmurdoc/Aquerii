import { type Page, type Locator } from '@playwright/test'

export class NavigationPage {
  readonly page: Page
  readonly boardsLink: Locator
  readonly documentsLink: Locator
  readonly crmLink: Locator
  readonly settingsLink: Locator
  readonly logoutButton: Locator

  constructor(page: Page) {
    this.page = page
    this.boardsLink = page.getByRole('link', { name: 'Boards' })
    this.documentsLink = page.getByRole('link', { name: 'Documents' })
    this.crmLink = page.getByRole('link', { name: 'CRM' })
    this.settingsLink = page.getByRole('link', { name: 'Settings' })
    this.logoutButton = page.getByTitle('Logout')
  }

  async goToBoards() {
    await this.boardsLink.click()
  }

  async goToDocuments() {
    await this.documentsLink.click()
  }

  async goToCRM() {
    await this.crmLink.click()
  }

  async goToSettings() {
    await this.settingsLink.click()
  }

  async logout() {
    await this.logoutButton.click()
  }
}
