import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;
// Override via PLAYWRIGHT_BASE_URL=http://localhost:8787 for local wrangler dev runs
// (pre-deploy validation). Production default otherwise — used by CI and by default runs.
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://datos-itam.org';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: isCI
    ? [['list'], ['html', { open: 'never' }], ['github']]
    : [['list']],
  use: {
    baseURL: BASE_URL,
    extraHTTPHeaders: {
      Origin: BASE_URL,
    },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
