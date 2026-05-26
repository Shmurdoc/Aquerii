import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir:              './tests/e2e',
  fullyParallel:        true,
  forbidOnly:           !!process.env.CI,
  retries:              process.env.CI ? 2 : 0,
  workers:              1,
  reporter:             [['html', { open: 'never' }]],
  use: {
    baseURL:            process.env.BASE_URL ?? 'http://localhost:3000',
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
            'network.cookie.cookieBehavior': 0, // accept all cookies
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
