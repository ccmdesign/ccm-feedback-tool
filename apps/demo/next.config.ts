import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ccm-feedback/core"],
  output: "standalone",
};

export default nextConfig;
