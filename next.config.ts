import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
const isVercel = !!process.env["VERCEL"];
/** Preview deployments get the Vercel Toolbar; production does not. */
const isPreview = process.env["VERCEL_ENV"] === "preview";

/**
 * Content-Security-Policy.
 *
 * `script-src` allows 'unsafe-inline' on purpose. Next.js streams the React
 * Server Component payload as inline <script> tags, and next-themes injects an
 * inline pre-paint script. The only way to drop 'unsafe-inline' is a per-request
 * nonce, which forces *every* page to render dynamically — all 2189 landing
 * pages would lose static generation and ISR. Everything else is locked down:
 * no third-party script, style, font, image or connection origins at all.
 *
 * The Vercel Toolbar origins come from Vercel's own CSP guidance and are only
 * added on preview deployments.
 */
const toolbar = (...sources: string[]) => (isPreview ? sources : []);

const csp = {
  "default-src": ["'self'"],
  "script-src": ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : []), ...toolbar("https://vercel.live")],
  "style-src": ["'self'", "'unsafe-inline'", ...toolbar("https://vercel.live")],
  "img-src": ["'self'", "data:", "blob:", ...toolbar("https://vercel.live", "https://vercel.com")],
  "font-src": ["'self'", ...toolbar("https://vercel.live", "https://assets.vercel.com")],
  "connect-src": [
    "'self'",
    ...(isDev ? ["ws:"] : []),
    ...toolbar("https://vercel.live", "wss://ws-us3.pusher.com"),
  ],
  "frame-src": isPreview ? ["https://vercel.live"] : ["'none'"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'none'"],
  "manifest-src": ["'self'"],
  "worker-src": ["'self'", "blob:"],
};

const cspHeader = [
  ...Object.entries(csp).map(([directive, sources]) => `${directive} ${sources.join(" ")}`),
  // Only once deployed: on http://localhost it would rewrite every request to https.
  ...(isVercel ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspHeader },
  // Legacy equivalent of frame-ancestors 'none', for older browsers.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // No includeSubDomains or preload: both are commitments for the whole domain
  // that the domain owner should opt into deliberately. See DEPLOY.md.
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
  // robots.txt only stops crawling; this stops indexing of preview URLs that
  // have already been discovered (shared in Slack, linked from a PR, ...).
  ...(isPreview ? [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  poweredByHeader: false,
  // A stray package-lock.json in the home directory otherwise makes Turbopack
  // infer the workspace root above this project.
  turbopack: { root: import.meta.dirname },

  // Nothing renders through next/image: flags are emoji and the Open Graph cards
  // are generated. Turning the optimiser off removes /_next/image as a reachable
  // (and, on Vercel, billable) endpoint. Flip this if you add next/image.
  images: { unoptimized: true },

  // These routes read public/data from disk at request time. Next's tracer finds
  // the files today through path heuristics; listing them explicitly means a
  // refactor of load.server.ts cannot silently drop them from the deployed
  // functions, which would only show up as ENOENT in production.
  outputFileTracingIncludes: {
    "/results": ["./public/data/**/*.json"],
    "/next-visa": ["./public/data/**/*.json"],
    "/og": ["./public/data/**/*.json"],
    "/api/report": ["./public/data/**/*.json"],
    "/[passport]/[document]": ["./public/data/**/*.json"],
    "/[passport]/[document]/opengraph-image": ["./public/data/**/*.json"],
  },

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
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

  async redirects() {
    return [
      {
        // The "EU residence permit" preset became "Schengen residence permit":
        // almost every rule names Schengen, not the EU.
        source: "/:passport/with-eu-residence-permit",
        destination: "/:passport/with-schengen-residence-permit",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
