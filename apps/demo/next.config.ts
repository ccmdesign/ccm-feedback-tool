import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ccm-feedback/core"],
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
};

export default nextConfig;
