import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
    include: ["src/**/*.test.{js,jsx}"],
    exclude: ["e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{js,jsx}"],
      exclude: [
        "src/main.jsx",
        "src/test/**",
        "src/api/**",
        "src/App.jsx",
        "src/pages/MainView.jsx",
        "src/AuthContext.jsx",
      ],
      thresholds: {
        statements: 65,
        branches: 55,
        functions: 55,
        lines: 70,
      },
    },
  },
});
