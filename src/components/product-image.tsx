"use client";

import { useState } from "react";
import Image from "next/image";
import { LogoMark } from "@/components/logo";

/**
 * Renders a product's photo when one exists, or a tasteful placeholder tile
 * when it doesn't yet — most of the ported catalog has no photo until the
 * owner re-uploads originals through the admin panel (see the note in
 * src/lib/data/ported-listings.ts). Hovering swaps to the second image when
 * one is available, which is the "hover to preview" behavior carried over
 * from the old site.
 */
export function ProductImage({
  images,
  alt,
  className = "",
}: {
  images: { url: string }[];
  alt: string;
  className?: string;
}) {
  const [hovering, setHovering] = useState(false);

  if (!images.length) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_30%_20%,var(--color-gold-soft),var(--color-cream-soft)_70%)] text-forest/50 ${className}`}
      >
        <LogoMark className="h-10 w-10 opacity-60" />
        <span className="text-[0.65rem] font-medium uppercase tracking-widest opacity-70">
          Photo coming soon
        </span>
      </div>
    );
  }

  const primary = images[0];
  const secondary = images[1] ?? images[0];
  const showing = hovering ? secondary : primary;

  return (
    <div
      className={`relative overflow-hidden bg-cream-soft ${className}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <Image
        src={showing.url}
        alt={alt}
        fill
        sizes="(max-width: 768px) 50vw, 25vw"
        className="object-cover transition duration-500"
      />
    </div>
  );
}
