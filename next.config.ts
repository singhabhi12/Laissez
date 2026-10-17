import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // A stray package-lock.json in the home directory otherwise makes Turbopack
  // infer the workspace root above this project.
  turbopack: { root: import.meta.dirname },
  async headers() {
    return [
      {
        // Dynamic pages default to no-store, which bars them from the
        // back/forward cache. The content is a pure function of the URL, so it
        // is safe to revalidate instead.
        source: "/results",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
      {
        source: "/world-110m.json",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
