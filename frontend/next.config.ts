import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Include the sibling architecture package in production output tracing.
  outputFileTracingRoot: path.join(__dirname, ".."),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ui-avatars.com" },
      { protocol: "https", hostname: "cdn.sportmonks.com" },
    ],
  },
};

export default nextConfig;
