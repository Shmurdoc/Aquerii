import { test as base } from '@playwright/test'
import { LoginPage } from './pages/LoginPage'
import { BoardsPage } from './pages/BoardsPage'
import { BoardPage } from './pages/BoardPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { DocumentPage } from './pages/DocumentPage'
import { CRMPage } from './pages/CRMPage'
import { NavigationPage } from './pages/NavigationPage'

type Pages = {
  loginPage: LoginPage
  boardsPage: BoardsPage
  boardPage: BoardPage
  documentsPage: DocumentsPage
  documentPage: DocumentPage
  crmPage: CRMPage
  nav: NavigationPage
}

export const test = base.extend<Pages>({
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  boardsPage: async ({ page }, use) => use(new BoardsPage(page)),
  boardPage: async ({ page }, use) => use(new BoardPage(page)),
  documentsPage: async ({ page }, use) => use(new DocumentsPage(page)),
  documentPage: async ({ page }, use) => use(new DocumentPage(page)),
  crmPage: async ({ page }, use) => use(new CRMPage(page)),
  nav: async ({ page }, use) => use(new NavigationPage(page)),
})

export { expect } from '@playwright/test'
