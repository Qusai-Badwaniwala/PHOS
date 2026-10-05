import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";
const config = [
  ...nextVitals,
  ...nextTypescript,
  prettier,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "react/react-in-jsx-scope": "off",
      // PHOS uses explicit, uncompiled effects to reconcile its local database.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["*.config.js", "*.config.mjs", "*.config.ts", "*.config.mts", "jest.setup.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  { files: ["scripts/**"], rules: { "no-console": "off" } },
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "database/**",
      "dist/**",
      "build/**",
      "out/**",
      "coverage/**",
    ],
  },
];

export default config;
