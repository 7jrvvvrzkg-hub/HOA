import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Broad on purpose for now: product photos will come from Supabase
    // Storage (once that project exists) and possibly other hosts during
    // setup. Once the real Supabase project URL is known, narrow this to
    // that single hostname for tighter security.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
