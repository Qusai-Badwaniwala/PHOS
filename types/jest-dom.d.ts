/**
 * Registers jest-dom's matchers (`toBeInTheDocument`, `toBeDisabled`, …)
 * with TypeScript.
 *
 * They are loaded at runtime by `jest.setup.js`, which is plain
 * JavaScript and therefore invisible to `tsc`. Without this the UI
 * tests run green while `npm run typecheck` reports every matcher as
 * missing.
 */
import "@testing-library/jest-dom";
