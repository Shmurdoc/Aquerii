# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.ts >> Authentication >> logs in with valid credentials
- Location: tests\e2e\app.spec.ts:28:3

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/(onboarding|boards)/
Received string:  "http://localhost:3000/login"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    9 × unexpected value "http://localhost:3000/login"

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - heading "Aquerii" [level=1] [ref=e6]
      - paragraph [ref=e7]: Work that flows.
    - generic [ref=e9]:
      - heading "Sign in" [level=2] [ref=e10]
      - generic [ref=e11]:
        - generic [ref=e12]: Email
        - textbox [ref=e13]: test@example.com
      - generic [ref=e14]:
        - generic [ref=e15]: Password
        - textbox [ref=e16]: password123
      - button "Sign in" [ref=e17] [cursor=pointer]
      - paragraph [ref=e18]:
        - text: No account?
        - link "Create one" [ref=e19] [cursor=pointer]:
          - /url: /register
  - generic [ref=e20]:
    - img [ref=e22]
    - button "Open Tanstack query devtools" [ref=e70] [cursor=pointer]:
      - img [ref=e71]
```

# Test source

```ts
  1   | import { test, expect } from './fixtures'
  2   | import { boardsUrl } from './helpers'
  3   | 
  4   | async function loginAndGoToBoards(test: {
  5   |   loginPage: any; boardsPage: any; page: any
  6   | }) {
  7   |   const { loginPage, boardsPage, page } = test
  8   |   await loginPage.login('test@example.com', 'password123')
  9   |   await page.waitForURL(/\/(onboarding|boards)/, { timeout: 15000 })
  10  |   if (page.url().includes('/onboarding')) {
  11  |     await page.goto(boardsUrl())
  12  |     await page.waitForURL(/\/boards/, { timeout: 10000 })
  13  |   }
  14  | }
  15  | 
  16  | test.describe('Authentication', () => {
  17  |   test('redirects unauthenticated user to login', async ({ page }) => {
  18  |     await page.goto(boardsUrl())
  19  |     await expect(page).toHaveURL(/\/login/)
  20  |   })
  21  | 
  22  |   test('shows validation errors on empty login submit', async ({ loginPage, page }) => {
  23  |     await loginPage.goto()
  24  |     await loginPage.submit()
  25  |     await expect(page.locator('text=required')).toBeVisible()
  26  |   })
  27  | 
  28  |   test('logs in with valid credentials', async ({ loginPage, page }) => {
  29  |     await loginPage.login('test@example.com', 'password123')
> 30  |     await expect(page).toHaveURL(/\/(onboarding|boards)/)
      |                        ^ Error: expect(page).toHaveURL(expected) failed
  31  |   })
  32  | })
  33  | 
  34  | test.describe('Onboarding', () => {
  35  |   test.beforeEach(async ({ loginPage, page }) => {
  36  |     await loginPage.login('test@example.com', 'password123')
  37  |     await page.waitForURL(/\/(onboarding|boards)/, { timeout: 15000 })
  38  |     await page.goto(`${process.env.BASE_URL ?? 'http://localhost:3000'}/onboarding`)
  39  |   })
  40  | 
  41  |   test('completes workspace creation step', async ({ page }) => {
  42  |     await page.fill('input[placeholder*="Acme"]', 'Test Workspace')
  43  |     await page.click('button:has-text("Continue")')
  44  |     await expect(page.locator('text=What best describes you')).toBeVisible()
  45  |   })
  46  | })
  47  | 
  48  | test.describe('Boards', () => {
  49  |   test.beforeEach(async ({ page, loginPage, boardsPage }) => {
  50  |     await loginAndGoToBoards({ loginPage, boardsPage, page })
  51  |   })
  52  | 
  53  |   test('displays boards page', async ({ boardsPage }) => {
  54  |     await expect(boardsPage.heading).toBeVisible()
  55  |   })
  56  | 
  57  |   test('can create a new board', async ({ boardsPage, page }) => {
  58  |     await boardsPage.createBoard()
  59  |     await expect(page).toHaveURL(/\/boards\/[a-z0-9-]+/, { timeout: 10000 })
  60  |   })
  61  | 
  62  |   test('opens board and shows kanban view', async ({ boardsPage, boardPage }) => {
  63  |     await boardsPage.openBoard()
  64  |     await expect(boardPage.kanbanButton).toBeVisible()
  65  |   })
  66  | 
  67  |   test('can switch to table view', async ({ boardsPage, boardPage }) => {
  68  |     await boardsPage.openBoard()
  69  |     await boardPage.switchToTableView()
  70  |     await expect(boardPage.page.locator('text=Title')).toBeVisible()
  71  |     await expect(boardPage.page.locator('text=Due Date')).toBeVisible()
  72  |   })
  73  | 
  74  |   test('can switch to calendar view', async ({ boardsPage, boardPage }) => {
  75  |     await boardsPage.openBoard()
  76  |     await boardPage.switchToCalendarView()
  77  |     await expect(boardPage.page.locator('text=Mon')).toBeVisible()
  78  |   })
  79  | 
  80  |   test('navigates between pages via sidebar', async ({ nav, boardsPage, page }) => {
  81  |     await expect(boardsPage.heading).toBeVisible()
  82  |     await nav.goToDocuments()
  83  |     await expect(page).toHaveURL(/\/documents/)
  84  |     await nav.goToCRM()
  85  |     await expect(page).toHaveURL(/\/crm/)
  86  |     await nav.goToBoards()
  87  |     await expect(page).toHaveURL(/\/boards/)
  88  |   })
  89  | })
  90  | 
  91  | test.describe('Documents', () => {
  92  |   test.beforeEach(async ({ page, loginPage, boardsPage, documentsPage }) => {
  93  |     await loginAndGoToBoards({ loginPage, boardsPage, page })
  94  |     await documentsPage.goto()
  95  |   })
  96  | 
  97  |   test('displays documents page', async ({ documentsPage }) => {
  98  |     await expect(documentsPage.heading).toBeVisible()
  99  |   })
  100 | 
  101 |   test('can create a new document', async ({ documentsPage, page }) => {
  102 |     await documentsPage.createNewNote()
  103 |     await expect(page).toHaveURL(/\/documents\/[a-z0-9-]+/)
  104 |   })
  105 | })
  106 | 
  107 | test.describe('CRM', () => {
  108 |   test('displays pipeline view', async ({ page, loginPage, boardsPage, crmPage }) => {
  109 |     await loginAndGoToBoards({ loginPage, boardsPage, page })
  110 |     await crmPage.goto()
  111 |     await expect(crmPage.stageHeader('Lead')).toBeVisible({ timeout: 5000 })
  112 |   })
  113 | })
  114 | 
```