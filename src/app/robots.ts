import type { MetadataRoute } from "next";

// Keep search engines out of everything except the public page.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/portal", "/login", "/security", "/forgot-password", "/reset-password", "/api"] }],
  };
}
