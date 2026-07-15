import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";

export default [
  { ignores: ["dist", "coverage", "test-results", "playwright-report", ".playwright-libs"] },
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.es2021 },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // Only the long-standing hook rules, not eslint-plugin-react-hooks v7's
      // React Compiler-oriented ruleset (static-components/set-state-in-effect/etc.),
      // which flags idiomatic React 18 data-fetching patterns used throughout this codebase.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true, allowExportNames: ["useAuth"] }],
    },
  },
  {
    files: ["src/**/*.test.{js,jsx}", "src/test/**/*.js"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, ...globals.es2021 },
    },
  },
  {
    files: ["e2e/**/*.js", "playwright.config.js", "vite.config.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node },
    },
  },
  eslintConfigPrettier,
];
