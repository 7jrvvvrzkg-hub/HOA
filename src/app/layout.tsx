import type { Metadata } from "next";
import Providers from "@/components/Providers";
import "./globals.css";

// Using the system font stack (defined in globals.css) instead of
// next/font/google — no external font fetch at build time, so this builds
// reliably offline / behind restrictive network policies, and loads a
// little faster for visitors too. Swap in next/font or a self-hosted
// webfont later if the HOA wants a specific brand typeface.

export const metadata: Metadata = {
  title: "Tazewell Place",
  description: "The resident and owner portal for Tazewell Place, 230 West Tazewell Street, Norfolk, VA.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-cream text-ink">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
