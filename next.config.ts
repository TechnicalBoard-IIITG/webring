import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  async rewrites() {
    const api = process.env.API_INTERNAL_URL?.replace(/\/+$/, "");
    // Keep browser requests and session cookies on the frontend's own origin.
    // A separate prefix preserves Next's existing /api/stats and directory routes.
    return api ? [{ source: "/backend/:path*", destination: `${api}/:path*` }] : [];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "github.com",
      },
    ],
  },
};

export default nextConfig;
