import type { NextConfig } from "next";

// Pages that get their own nonce-based policy from src/proxy.ts. Everything
// else (the public homepage and files) gets the static one below.
const PROXIED = "portal|login|forgot-password|reset-password|security";

const staticCsp = [
  "default-src 'self'",
  // The public page is pre-built, so it can't carry a per-request nonce.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : []),
].join("; ");

const nextConfig: NextConfig = {
  // Don't advertise which framework/version is running.
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // Next's own default is 1MB, well under what a document/avatar upload
      // needs. Vercel's serverless functions have a separate, fixed 4.5MB
      // ceiling on any request body that can't be raised from here — this
      // just brings Next's own limit up to meet it, with a little headroom
      // left below 4.5MB for the multipart form overhead. See
      // src/actions/documents.ts and src/actions/profile.ts for the actual
      // per-file size caps, which stay safely under this.
      bodySizeLimit: "4.5mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Browsers will only ever use https for this site (for two years).
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Can't be shown inside another site's frame (clickjacking).
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
      {
        // The logo at the top of our emails is loaded from other sites' mail
        // pages, so this one picture (only) may be embedded elsewhere.
        source: "/images/email-logo.png",
        headers: [{ key: "Cross-Origin-Resource-Policy", value: "cross-origin" }],
      },
      {
        source: `/((?!${PROXIED}).*)`,
        headers: [{ key: "Content-Security-Policy", value: staticCsp }],
      },
    ];
  },
};

export default nextConfig;
