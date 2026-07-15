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
    screenshot: "only-on-failure",
  },
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "list",
  webServer: [
    {
      // backend + PostgreSQL をコンテナで起動する (root の compose.e2e.yaml)。
      // port ではなく url で待つ: ポート公開は uvicorn の起動より先に開くため。
      command: "docker compose -f compose.e2e.yaml up --build --force-recreate",
      cwd: "..",
      url: "http://127.0.0.1:8000/products",
      timeout: 300000,
      reuseExistingServer: !process.env.CI,
      gracefulShutdown: { signal: "SIGTERM", timeout: 30000 },
    },
    {
      command: "npm run dev -- --port 5174",
      cwd: ".",
      port: 5174,
      timeout: 60000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
