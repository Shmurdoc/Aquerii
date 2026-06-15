import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.BASE_URL ?? process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

// If BASE_URL or PLAYWRIGHT_BASE_URL is provided, expect an existing server
// (e.g., dockerized app behind Caddy). Do not start a local dev server.
const webServer = baseURL !== 'http://localhost:3000'
  ? undefined
  : {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
    }

export default defineConfig({
  testDir:              './tests/e2e',
  fullyParallel:        true,
  forbidOnly:           !!process.env.CI,
  retries:              process.env.CI ? 2 : 1,
  workers:              process.env.CI ? 1 : undefined,
  reporter:             [['html', { open: 'never' }], ['list']],
  timeout:              30000,
  use: {
    baseURL,
    trace:              'on-first-retry',
    screenshot:         'only-on-failure',
    ignoreHTTPSErrors:  true,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        launchOptions: {
          firefoxUserPrefs: {
            'dom.storage.next_gen':       true,
            'network.cookie.cookieBehavior': 0,
          },
        },
      },
    },
  ],
  webServer,
})
