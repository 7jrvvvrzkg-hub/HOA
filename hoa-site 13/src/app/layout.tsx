import type { Metadata } from "next";
import Providers from "@/components/Providers";
// Cinzel: the closest free match to the wordmark in the Tazewell Place logo
// (its lowercase letters are small capitals, like the logo). Self-hosted via
// @fontsource so there is no runtime request to Google and builds work offline.
import "@fontsource/cinzel/400.css";
import "@fontsource/cinzel/500.css";
import "@fontsource/cinzel/600.css";
import "@fontsource/cinzel/700.css";
import "@fontsource/cinzel/800.css";
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
