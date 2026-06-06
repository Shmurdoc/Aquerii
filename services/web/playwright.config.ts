import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir:              './tests/e2e',
  fullyParallel:        true,
  forbidOnly:           !!process.env.CI,
  retries:              process.env.CI ? 2 : 1,
  workers:              1,
  reporter:             [['html', { open: 'never' }]],
  use: {
    baseURL:            process.env.BASE_URL ?? 'https://localhost',
    trace:              'on-first-retry',
    screenshot:         'only-on-failure',
    ignoreHTTPSErrors:  true,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ignoreHTTPSErrors: true,
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        ignoreHTTPSErrors: true,
        launchOptions: {
          firefoxUserPrefs: {
            'network.cookie.cookieBehavior': 0,
          },
        },
      },
    },
  ],
  webServer: (process.env.CI || process.env.BASE_URL) ? undefined : {
    command: 'npm run dev',
    url:     'http://localhost:3000',
    reuseExistingServer: true,
  },
})
