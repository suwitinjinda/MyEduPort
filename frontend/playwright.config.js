// UI test suite: run with `npm run test:ui` (see package.json).
// Needs the dev server on 5173 and the API on 4000 (both run under pm2).
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { outputFolder: "tests/report", open: "never" }]],
  use: {
    baseURL: process.env.UI_BASE_URL || "http://127.0.0.1:5173",
    screenshot: "only-on-failure",
    video: "off",
    trace: "retain-on-failure"
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1400, height: 1000 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } }
  ]
});
