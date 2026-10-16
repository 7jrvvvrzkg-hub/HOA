import type { Metadata } from "next";

// Rendered fresh on every request so the page can carry the per-request
// security nonce (see src/proxy.ts), and kept out of search engines.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
