import { type Page, type Locator } from '@playwright/test'
import { documentsUrl } from '../helpers'

export class DocumentsPage {
  readonly page: Page
  readonly heading: Locator
  readonly notesTab: Locator
  readonly filesTab: Locator
  readonly newNoteButton: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole('heading', { name: 'Documents' })
    this.notesTab = page.getByRole('button', { name: 'notes' })
    this.filesTab = page.getByRole('button', { name: 'files' })
    this.newNoteButton = page.getByRole('button', { name: /New Note/i })
  }

  async goto() {
    await this.page.goto(documentsUrl())
  }

  async switchToNotes() {
    await this.notesTab.click()
  }

  async switchToFiles() {
    await this.filesTab.click()
  }

  async createNewNote(): Promise<void> {
    await this.newNoteButton.click()
  }
}
