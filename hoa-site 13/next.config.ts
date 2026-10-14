import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
