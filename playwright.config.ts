import { defineConfig, devices } from "@playwright/test";
import "dotenv/config";

const PORT = 3100;

/**
 * End-to-end tests against a production build with its own server on port 3100.
 * They reseed the demo user and delete it in the account test, so they only run against a local
 * database (see tests/e2e/support.ts). Emails go to test-results/outbox instead of being sent.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1, // one shared, reseeded database
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "en-GB",
    timezoneId: "Europe/London",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      APP_URL: `http://localhost:${PORT}`,
      AUTH_SECRET: process.env.AUTH_SECRET || "e2e-only-secret-not-used-anywhere-else-000000",
      AUTH_TRUST_HOST: "true",
      CRON_SECRET: "e2e-cron-secret",
      EMAIL_TRANSPORT: "outbox",
      EMAIL_OUTBOX_DIR: "test-results/outbox",
    },
  },
});
