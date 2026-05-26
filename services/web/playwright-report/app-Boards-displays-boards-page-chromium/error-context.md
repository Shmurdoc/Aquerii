# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.ts >> Boards >> displays boards page
- Location: tests\e2e\app.spec.ts:53:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at https://127.0.0.1/login
Call log:
  - navigating to "https://127.0.0.1/login", waiting until "load"

```

# Test source

```ts
  1  | import { type Page, type Locator } from '@playwright/test'
  2  | import { BASE } from '../helpers'
  3  | 
  4  | export class LoginPage {
  5  |   readonly page: Page
  6  |   readonly emailInput: Locator
  7  |   readonly passwordInput: Locator
  8  |   readonly submitButton: Locator
  9  |   readonly mfaInput: Locator
  10 |   readonly registerLink: Locator
  11 | 
  12 |   constructor(page: Page) {
  13 |     this.page = page
  14 |     this.emailInput = page.locator('input[type="email"]')
  15 |     this.passwordInput = page.locator('input[type="password"]')
  16 |     this.submitButton = page.getByRole('button', { name: 'Sign in' })
  17 |     this.mfaInput = page.getByLabel('MFA Code')
  18 |     this.registerLink = page.getByRole('link', { name: 'Create one' })
  19 |   }
  20 | 
  21 |   async goto() {
> 22 |     await this.page.goto(`${BASE}/login`)
     |                     ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at https://127.0.0.1/login
  23 |   }
  24 | 
  25 |   async fill(email: string, password: string) {
  26 |     await this.emailInput.fill(email)
  27 |     await this.passwordInput.fill(password)
  28 |   }
  29 | 
  30 |   async submit() {
  31 |     await this.submitButton.click()
  32 |   }
  33 | 
  34 |   async login(email: string, password: string) {
  35 |     await this.goto()
  36 |     await this.fill(email, password)
  37 |     await this.submit()
  38 |   }
  39 | }
  40 | 
```