import { defineConfig, devices } from "@playwright/test";

// Allow running with a system-installed Chrome when the Playwright browser
// bundle has not been downloaded yet.
// Usage:  PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe" npx playwright test
const systemChrome = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || null;

export default defineConfig({
  // Directory where Playwright looks for test files
  testDir: "./tests/e2e",

  // Maximum time one test can run
  timeout: 30_000,

  // Fail fast on CI
  forbidOnly: !!process.env.CI,

  // Retry on failure in CI
  retries: process.env.CI ? 2 : 0,

  // Reporter
  reporter: "list",

  use: {
    // Serve the project root via `npx serve` before running tests
    // Start the server with `npx serve . -l 3000` and set baseURL here
    baseURL: "http://localhost:3000",

    // Collect traces on first retry
    trace: "on-first-retry",

    // Use system Chrome when the env var is set
    ...(systemChrome ? { launchOptions: { executablePath: systemChrome } } : {}),
  },

  // Spin up a static file server automatically before running e2e tests
  webServer: {
    command: "npx serve . --listen 3000 --no-clipboard",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],
});
