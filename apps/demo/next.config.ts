import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ccm-feedback/core"],
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  // Trace the Prisma Linux query-engine binary into the serverless function
  // payload. `serverExternalPackages` stops the bundler from inlining Prisma,
  // but Netlify's file tracer otherwise ignores the generated `.prisma/client`
  // directory — the Linux `.so.node` has to be included explicitly or the
  // function crashes at runtime with "Query Engine for rhel-openssl-3.0.x
  // could not be located".
  outputFileTracingIncludes: {
    "**": [
      "../../node_modules/.bun/@prisma+client*/node_modules/.prisma/client/**",
      "../../node_modules/.prisma/client/**",
    ],
  },
};

export default nextConfig;
