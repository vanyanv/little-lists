import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // this project has its own lockfile; pin the workspace root to silence the warning
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
