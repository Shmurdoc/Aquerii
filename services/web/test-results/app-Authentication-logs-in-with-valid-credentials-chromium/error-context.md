# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.ts >> Authentication >> logs in with valid credentials
- Location: tests\e2e\app.spec.ts:16:3

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/(onboarding|boards)/
Received string:  "https://localhost/login"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    13 × unexpected value "https://localhost/login"

```

```yaml
- heading "Aquerii" [level=1]
- paragraph: Work that flows.
- heading "Sign in" [level=2]
- text: Email
- textbox
- text: Password
- textbox
- button "Sign in"
- paragraph:
  - text: No account?
  - link "Create one":
    - /url: /register
- paragraph:
  - text: By continuing you agree to our
  - link "Terms":
    - /url: /terms
  - text: and
  - link "Privacy Policy":
    - /url: /privacy
  - text: .
- paragraph: The operating system for ambitious teams
- heading "Projects, CRM, ERP, and AI — in one cinematic surface." [level=2]
- paragraph: Boards, pipelines, invoices, safety, support. Everything wired into one fast, keyboard-driven workspace. No tab graveyard.
- list:
  - listitem: Realtime collaboration across every record
  - listitem: Workspaces, roles, and field permissions
  - listitem: Audit logs, MFA, and SSO on every plan
- paragraph: © 2026 Aquerii
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
> 18  |     await expect(page).toHaveURL(/\/(onboarding|boards)/)
      |                        ^ Error: expect(page).toHaveURL(expected) failed
  19  |   })
  20  | })
  21  | 
  22  | test.describe('Onboarding', () => {
  23  |   test.beforeEach(async ({ loginPage, page }) => {
  24  |     await loginPage.login('test@example.com', 'password123')
  25  |     await page.waitForURL(/\/(onboarding|boards)/, { timeout: 15000 })
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