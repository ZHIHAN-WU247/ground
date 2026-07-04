import type { NextConfig } from "next";

const distDir = process.env.NEXT_DIST_DIR;

const nextConfig: NextConfig = {
  ...(distDir ? { distDir } : {}),
  transpilePackages: ["@ground/shared"],
  webpack: (config, { dev }) => {
    // The Windows dev environment has been corrupting webpack filesystem cache packs,
    // which then leaves missing server chunks like "./208.js" inside .next/server.
    if (dev) {
      config.cache = false;
    }

    return config;
  }
};

export default nextConfig;
