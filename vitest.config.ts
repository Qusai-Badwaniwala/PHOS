import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Vitest configuration.
 *
 * Per the SDS "Testing Rules", every public interface (Engines,
 * Repositories, Validators, DTOs) must be tested. API routes were on
 * that list until Phase 9 removed them; what they did now lives in
 * `client/operations`, covered through the adapters that call it.
 */
export default defineConfig({
  test: {
    environment: "node",
    // Scoped to backend .test.ts files only. Frontend component tests
    // use .test.tsx and run under Jest instead (see jest.config.js) —
    // explicitly excluded here so the two test runners never contend
    // for the same files.
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/**/*.test.tsx", "node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["engines/**", "repositories/**", "validators/**", "shared/**", "lib/**"],
      exclude: ["**/*.d.ts", "**/index.ts"],
    },
  },
  resolve: {
    alias: {
      "@/app": path.resolve(__dirname, "./app"),
      "@/components": path.resolve(__dirname, "./components"),
      "@/providers": path.resolve(__dirname, "./providers"),
      "@/engines": path.resolve(__dirname, "./engines"),
      "@/repositories": path.resolve(__dirname, "./repositories"),
      "@/validators": path.resolve(__dirname, "./validators"),
      "@/lib": path.resolve(__dirname, "./lib"),
      "@/shared": path.resolve(__dirname, "./shared"),
      "@/types": path.resolve(__dirname, "./types"),
      "@/client": path.resolve(__dirname, "./client"),
    },
  },
});
