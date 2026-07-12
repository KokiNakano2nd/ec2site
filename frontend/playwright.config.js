import { defineConfig } from "@playwright/test";

// NOTE on headless Chromium in this sandbox: `playwright install --with-deps`
// requires root (apt-get) which isn't available here. The missing shared libs
// (libnspr4, libnss3, libnssutil3, libasound.so.2) were downloaded with
// `apt-get download` (no root required) and extracted into
// frontend/.playwright-libs/ (gitignored). Run e2e tests via `npm run test:e2e`,
// which sets LD_LIBRARY_PATH to that directory - running `npx playwright test`
// directly will fail with "cannot open shared object file" unless you export
// LD_LIBRARY_PATH="$PWD/.playwright-libs" yourself first.

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    // The backend's CORS allow_origins is hardcoded to http://localhost:5174
    // (see backend/app/main.py), so the e2e frontend server runs on 5174
    // instead of the normal dev port (5173) to avoid CORS failures.
    baseURL: "http://localhost:5174",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command:
        "rm -f /tmp/ec_site_e2e.db && DATABASE_URL=sqlite:////tmp/ec_site_e2e.db STRIPE_SECRET_KEY= SMTP_HOST= /home/test/EC_SITE/backend/.venv/bin/uvicorn app.main:app --port 8000 --app-dir /home/test/EC_SITE/backend",
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
