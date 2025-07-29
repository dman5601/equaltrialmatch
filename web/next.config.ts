// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Proxy /api/ctgov to your Express server
  async rewrites() {
    return [
      {
        source: "/api/ctgov/:path*",
        destination: "http://localhost:5000/ctgov/:path*",
      },
      {
        // Also catch requests without any extra path
        source: "/api/ctgov",
        destination: "http://localhost:5000/ctgov",
      },
    ];
  },
};

export default nextConfig;
