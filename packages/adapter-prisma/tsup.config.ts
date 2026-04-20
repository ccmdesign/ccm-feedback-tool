import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  platform: "node",
  target: "node18",
  dts: true,
  sourcemap: true,
  clean: true,
  noExternal: ["@ccm-feedback/core"],
  external: ["@prisma/client"],
});
