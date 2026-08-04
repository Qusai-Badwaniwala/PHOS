const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  // Scoped to frontend .test.tsx files only. Backend .test.ts files run
  // under Vitest instead (see vitest.config.ts) — the original pattern
  // here (`**/*.test.(ts|tsx)`) also matched those Vitest-authored
  // files, which import from the "vitest" package and would fail under
  // Jest's runner. Narrowed to .tsx so the two test runners never
  // contend for the same files.
  testMatch: ["<rootDir>/tests/**/*.test.tsx"],
  // Keep Jest out of build output; otherwise it scans
  // `.next/standalone`, which contains a duplicate package.json.
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
