import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist", "uploads", "old_backup"]),
  {
    files: ["**/*.{js,jsx}"],
    extends: [
      js.configs.recommended,
      reactHooks.configs["recommended-latest"],
      reactRefresh.configs.vite,
    ],
    plugins: {
      react,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: "latest",
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    rules: {
      // ESLint core does not see component names used inside JSX;
      // this rule marks them as used so no-unused-vars works with JSX.
      "react/jsx-uses-vars": "error",
    },
  },
  {
    // Hooks files never export components - they export functions on purpose.
    files: ["src/APP/Hooks/**/*.jsx"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
]);
