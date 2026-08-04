import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

/**
 * ESLint configuration.
 *
 * Enforces the PHOS SDS coding standards:
 * - No `any` (warn, escalate to error once modules are implemented)
 * - No unused variables/imports
 * - No magic-number-style patterns are caught in code review, not lint,
 *   since ESLint cannot reliably distinguish business-meaningful
 *   constants from harmless literals.
 * - Prettier owns formatting; eslint-config-prettier disables any
 *   ESLint rule that would conflict with it.
 */
const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript", "prettier"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      // Not needed with the modern JSX transform Next.js uses, but kept
      // explicit to match the frontend repository's original ESLint
      // config intent.
      "react/react-in-jsx-scope": "off",
    },
  },
  {
    // Build-tooling config files. `require()` is the idiomatic (and for
    // jest.config.js, the required CommonJS) form here — Tailwind's
    // `plugins` array and next/jest are both documented this way. The
    // rule stays on for all application code.
    files: ["*.config.js", "*.config.mjs", "*.config.ts", "jest.setup.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    // Developer command-line scripts, run by hand via npm (see
    // `scripts/`). Printing what they did to stdout is their entire
    // user interface, not stray debug output, so `no-console` does not
    // apply. The rule stays on for all application code.
    files: ["scripts/**"],
    rules: {
      "no-console": "off",
    },
  },
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "database/**",
      "prisma/migrations/**",
      "dist/**",
      "build/**",
      "out/**",
      "coverage/**",
    ],
  },
];

export default eslintConfig;
