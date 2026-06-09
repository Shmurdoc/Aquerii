import { test as base } from '@playwright/test'
import { LoginPage } from './pages/LoginPage'
import { BoardsPage } from './pages/BoardsPage'
import { BoardPage } from './pages/BoardPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { DocumentPage } from './pages/DocumentPage'
import { CRMPage } from './pages/CRMPage'
import { NavigationPage } from './pages/NavigationPage'
import { PermitPage } from './pages/PermitPage'
import { CompliancePage } from './pages/CompliancePage'
import { GateKioskPage } from './pages/GateKioskPage'
import { ROIDashboardPage } from './pages/ROIDashboardPage'
import { EquipmentListPage } from './pages/EquipmentListPage'
import { EquipmentDetailPage } from './pages/EquipmentDetailPage'
import { GateKioskEquipmentPage } from './pages/GateKioskEquipmentPage'

type Pages = {
  loginPage: LoginPage
  boardsPage: BoardsPage
  boardPage: BoardPage
  documentsPage: DocumentsPage
  documentPage: DocumentPage
  crmPage: CRMPage
  nav: NavigationPage
  permitPage: PermitPage
  compliancePage: CompliancePage
  gateKioskPage: GateKioskPage
  roiDashboardPage: ROIDashboardPage
  equipmentListPage: EquipmentListPage
  equipmentDetailPage: EquipmentDetailPage
  gateKioskEquipmentPage: GateKioskEquipmentPage
}

export const test = base.extend<Pages>({
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  boardsPage: async ({ page }, use) => use(new BoardsPage(page)),
  boardPage: async ({ page }, use) => use(new BoardPage(page)),
  documentsPage: async ({ page }, use) => use(new DocumentsPage(page)),
  documentPage: async ({ page }, use) => use(new DocumentPage(page)),
  crmPage: async ({ page }, use) => use(new CRMPage(page)),
  nav: async ({ page }, use) => use(new NavigationPage(page)),
  permitPage: async ({ page }, use) => use(new PermitPage(page)),
  compliancePage: async ({ page }, use) => use(new CompliancePage(page)),
  gateKioskPage: async ({ page }, use) => use(new GateKioskPage(page)),
  roiDashboardPage: async ({ page }, use) => use(new ROIDashboardPage(page)),
  equipmentListPage: async ({ page }, use) => use(new EquipmentListPage(page)),
  equipmentDetailPage: async ({ page }, use) => use(new EquipmentDetailPage(page)),
  gateKioskEquipmentPage: async ({ page }, use) => use(new GateKioskEquipmentPage(page)),
})

export { expect } from '@playwright/test'
