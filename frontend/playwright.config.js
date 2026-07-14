import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    // Keep the E2E origin aligned with the local FRONTEND_URL default.
    baseURL: "http://localhost:5174",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "uv run python -m scripts.run_e2e_server",
      cwd: "../backend",
      port: 8000,
      timeout: 30000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npm run dev -- --port 5174",
      cwd: ".",
      port: 5174,
      timeout: 30000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
