import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // this project has its own lockfile; pin the workspace root to silence the warning
  turbopack: {
    root: __dirname,
  },
  images: {
    // every search provider's artwork host: TMDB posters, Open Library and
    // Google Books covers, iTunes album art (is1-is5.mzstatic.com)
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org", pathname: "/**" },
      { protocol: "https", hostname: "covers.openlibrary.org", pathname: "/**" },
      { protocol: "https", hostname: "books.google.com", pathname: "/**" },
      { protocol: "https", hostname: "**.googleusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "**.mzstatic.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
