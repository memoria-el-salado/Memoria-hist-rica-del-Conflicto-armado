import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Las guías del CNMH son PDF de varios megabytes.
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
