import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ccm-feedback/core"],
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  output: "standalone",
  // Trace the full `.prisma/client` directory into the serverless payload so
  // the Linux query-engine binary travels with the function. Next.js's default
  // tracer resolves Prisma's native addon based on the build-host platform and
  // drops the non-host binaries; `scripts/copy-prisma-rhel-engine.mjs` (run
  // after build in netlify.toml) fills the gap by copying the rhel `.so.node`
  // back into the standalone output.
  outputFileTracingIncludes: {
    "**": [
      "../../node_modules/.bun/@prisma+client*/node_modules/.prisma/client/**",
      "../../node_modules/.prisma/client/**",
    ],
  },
};

export default nextConfig;
