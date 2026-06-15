# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.ts >> Onboarding >> completes workspace creation step
- Location: tests\e2e\app.spec.ts:29:3

# Error details

```
TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
  navigated to "https://localhost/login"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e5]:
    - generic [ref=e6]:
      - img [ref=e8]
      - heading "Aquerii" [level=1] [ref=e10]
      - paragraph [ref=e11]: Work that flows.
    - generic [ref=e13]:
      - heading "Sign in" [level=2] [ref=e14]
      - generic [ref=e15]:
        - generic [ref=e16]: Email
        - textbox [ref=e17]
      - generic [ref=e18]:
        - generic [ref=e19]: Password
        - textbox [ref=e20]
      - button "Sign in" [ref=e21] [cursor=pointer]
      - paragraph [ref=e22]:
        - text: No account?
        - link "Create one" [ref=e23] [cursor=pointer]:
          - /url: /register
    - paragraph [ref=e24]:
      - text: By continuing you agree to our
      - link "Terms" [ref=e25] [cursor=pointer]:
        - /url: /terms
      - text: and
      - link "Privacy Policy" [ref=e26] [cursor=pointer]:
        - /url: /privacy
      - text: .
  - generic [ref=e32]:
    - generic [ref=e33]:
      - paragraph [ref=e34]: The operating system for ambitious teams
      - heading "Projects, CRM, ERP, and AI — in one cinematic surface." [level=2] [ref=e35]
      - paragraph [ref=e36]: Boards, pipelines, invoices, safety, support. Everything wired into one fast, keyboard-driven workspace. No tab graveyard.
    - list [ref=e37]:
      - listitem [ref=e38]:
        - img [ref=e40]
        - generic [ref=e42]: Realtime collaboration across every record
      - listitem [ref=e43]:
        - img [ref=e45]
        - generic [ref=e50]: Workspaces, roles, and field permissions
      - listitem [ref=e51]:
        - img [ref=e53]
        - generic [ref=e55]: Audit logs, MFA, and SSO on every plan
    - paragraph [ref=e56]: © 2026 Aquerii
```

# Test source

```ts
  1   | import { test, expect } from './fixtures'
  2   | import { boardsUrl } from './helpers'
  3   | 
  4   | test.describe('Authentication', () => {
  5   |   test('redirects unauthenticated user to login', async ({ page }) => {
  6   |     await page.goto(boardsUrl())
  7   |     await expect(page).toHaveURL(/\/login/)
  8   |   })
  9   | 
  10  |   test('shows validation errors on empty login submit', async ({ loginPage, page }) => {
  11  |     await loginPage.goto()
  12  |     await loginPage.submit()
  13  |     await expect(page.locator('text=required')).toBeVisible()
  14  |   })
  15  | 
  16  |   test('logs in with valid credentials', async ({ loginPage, page }) => {
  17  |     await loginPage.login('test@example.com', 'password123')
  18  |     await expect(page).toHaveURL(/\/(onboarding|boards)/)
  19  |   })
  20  | })
  21  | 
  22  | test.describe('Onboarding', () => {
  23  |   test.beforeEach(async ({ loginPage, page }) => {
  24  |     await loginPage.login('test@example.com', 'password123')
> 25  |     await page.waitForURL(/\/(onboarding|boards)/, { timeout: 15000 })
      |                ^ TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
  26  |     await page.goto(`${process.env.BASE_URL ?? 'http://localhost:3000'}/onboarding`)
  27  |   })
  28  | 
  29  |   test('completes workspace creation step', async ({ page }) => {
  30  |     await page.fill('input[placeholder*="Acme"]', 'Test Workspace')
  31  |     await page.click('button:has-text("Continue")')
  32  |     await expect(page.locator('text=What best describes you')).toBeVisible()
  33  |   })
  34  | })
  35  | 
  36  | test.describe('Boards', () => {
  37  |   test.beforeEach(async ({ page, loginPage, boardsPage }) => {
  38  |     const { loginPage: lp, boardsPage: bp, page: p } = { loginPage, boardsPage, page }
  39  |     await lp.login('test@example.com', 'password123')
  40  |     await p.waitForURL(/\/(onboarding|boards)/, { timeout: 15000 })
  41  |     if (p.url().includes('/onboarding')) {
  42  |       await p.goto(boardsUrl())
  43  |       await p.waitForURL(/\/boards/, { timeout: 10000 })
  44  |     }
  45  |   })
  46  | 
  47  |   test('displays boards page', async ({ boardsPage }) => {
  48  |     await expect(boardsPage.heading).toBeVisible()
  49  |   })
  50  | 
  51  |   test('can create a new board', async ({ boardsPage, page }) => {
  52  |     await boardsPage.createBoard()
  53  |     await expect(page).toHaveURL(/\/boards\/[a-z0-9-]+/, { timeout: 10000 })
  54  |   })
  55  | 
  56  |   test('opens board and shows kanban view', async ({ boardsPage, boardPage }) => {
  57  |     await boardsPage.openBoard()
  58  |     await expect(boardPage.kanbanButton).toBeVisible()
  59  |   })
  60  | 
  61  |   test('can switch to table view', async ({ boardsPage, boardPage }) => {
  62  |     await boardsPage.openBoard()
  63  |     await boardPage.switchToTableView()
  64  |     await expect(boardPage.page.locator('text=Title')).toBeVisible()
  65  |     await expect(boardPage.page.locator('text=Due Date')).toBeVisible()
  66  |   })
  67  | 
  68  |   test('can switch to calendar view', async ({ boardsPage, boardPage }) => {
  69  |     await boardsPage.openBoard()
  70  |     await boardPage.switchToCalendarView()
  71  |     await expect(boardPage.page.locator('text=Mon')).toBeVisible()
  72  |   })
  73  | 
  74  |   test('navigates between pages via sidebar', async ({ nav, boardsPage, page }) => {
  75  |     await expect(boardsPage.heading).toBeVisible()
  76  |     await nav.goToDocuments()
  77  |     await expect(page).toHaveURL(/\/documents/)
  78  |     await nav.goToCRM()
  79  |     await expect(page).toHaveURL(/\/crm/)
  80  |     await nav.goToBoards()
  81  |     await expect(page).toHaveURL(/\/boards/)
  82  |   })
  83  | })
  84  | 
  85  | test.describe('Documents', () => {
  86  |   test.beforeEach(async ({ page, loginPage, boardsPage, documentsPage }) => {
  87  |     await loginPage.login('test@example.com', 'password123')
  88  |     await page.waitForURL(/\/(onboarding|boards)/, { timeout: 15000 })
  89  |     if (page.url().includes('/onboarding')) {
  90  |       await page.goto(boardsUrl())
  91  |       await page.waitForURL(/\/boards/, { timeout: 10000 })
  92  |     }
  93  |     await documentsPage.goto()
  94  |   })
  95  | 
  96  |   test('displays documents page', async ({ documentsPage }) => {
  97  |     await expect(documentsPage.heading).toBeVisible()
  98  |   })
  99  | 
  100 |   test('can create a new document', async ({ documentsPage, page }) => {
  101 |     await documentsPage.createNewNote()
  102 |     await expect(page).toHaveURL(/\/documents\/[a-z0-9-]+/)
  103 |   })
  104 | })
  105 | 
  106 | test.describe('CRM', () => {
  107 |   test('displays pipeline view', async ({ page, loginPage, crmPage }) => {
  108 |     await loginPage.login('test@example.com', 'password123')
  109 |     await page.waitForURL(/\/(onboarding|boards)/, { timeout: 15000 })
  110 |     if (page.url().includes('/onboarding')) {
  111 |       await page.goto(boardsUrl())
  112 |       await page.waitForURL(/\/boards/, { timeout: 10000 })
  113 |     }
  114 |     await crmPage.goto()
  115 |     await expect(crmPage.stageHeader('Lead')).toBeVisible({ timeout: 5000 })
  116 |   })
  117 | })
  118 | 
```