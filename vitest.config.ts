import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const here = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    conditions: ["import", "module", "default"],
    // Mirror apps/demo/tsconfig.json `paths`: "@/*" → "./src/*". Lets route
    // smoke tests under apps/demo/src/**/__tests__ import the route module's
    // dependencies (@/lib/store, @/lib/ccm-stores) the same way the route
    // does, without reaching into Next's compile step.
    alias: {
      "@/": `${resolve(here, "apps/demo/src")}/`,
    },
  },
  test: {
    include: [
      "packages/**/__tests__/**/*.test.ts",
      "prisma/__tests__/**/*.test.ts",
      "prisma/__tests__/**/*.test.mjs",
      "apps/**/__tests__/**/*.test.ts",
      "apps/**/src/**/__tests__/**/*.test.ts",
      "apps/**/netlify/functions/__tests__/**/*.test.ts",
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
