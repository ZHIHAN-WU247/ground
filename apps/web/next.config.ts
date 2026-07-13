import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function nextConfig(phase: string): NextConfig {
  const distDir = process.env.NEXT_DIST_DIR ?? (phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : undefined);

  return {
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
}
