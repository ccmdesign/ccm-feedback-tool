import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    conditions: ["import", "module", "default"],
  },
  test: {
    include: [
      "packages/**/__tests__/**/*.test.ts",
      "prisma/__tests__/**/*.test.ts",
      "prisma/__tests__/**/*.test.mjs",
      "apps/**/__tests__/**/*.test.ts",
      "apps/**/src/**/__tests__/**/*.test.ts",
      "scripts/__tests__/**/*.test.mjs",
    ],
    coverage: {
      provider: "istanbul",
      reporter: ["text", "lcov", "json-summary"],
      include: ["packages/*/src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/index.ts", "**/icons.ts", "**/styles/**"],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 75,
        statements: 85,
      },
    },
  },
});
