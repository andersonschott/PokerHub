import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E config — corre contra a stack JÁ no ar:
 *   web (Vite):  http://localhost:5173
 *   api:         http://localhost:5100  (proxy /api + SignalR via VITE_API_URL)
 *
 * Não declaramos `webServer`: a stack é externa e persistente; os testes não devem
 * iniciá-la nem derrubá-la. Cada run usa identificadores únicos (ver e2e/seed.ts).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
