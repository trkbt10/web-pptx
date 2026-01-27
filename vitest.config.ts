/**
 * @file Vitest testing framework configuration
 *
 * This configuration sets up the Vitest test runner for the VectorDB
 * project, providing a fast and efficient testing environment. It configures:
 * - Global test utilities availability
 * - Node.js test environment for file system operations
 * - Test discovery and execution settings
 */

import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  resolve: {
    alias: {
      "@lib": path.resolve(__dirname, "src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: [path.resolve(__dirname, "spec/vitest.setup.ts")],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "coverage",
      include: ["src/**/*.{ts,tsx}"],
    },
  },
});
