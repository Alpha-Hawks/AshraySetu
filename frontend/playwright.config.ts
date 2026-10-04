import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./genie/__tests__",
  testMatch: ["**/*.smoke.spec.ts", "**/*.spec.ts"],
  timeout: 30000,
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
