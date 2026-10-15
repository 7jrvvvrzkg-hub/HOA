"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X } from "lucide-react";
import clsx from "clsx";

// A photo that opens full-screen when clicked: the page behind it blurs and
// dims, the photo shows with rounded corners, and an X (or Esc, or a click
// anywhere outside the photo) closes it. Use `fill` inside a `relative`
// box, or pass width/height for the photo's natural size.
type Props = {
  src: string;
  alt: string;
  width: number;
  height: number;
  sizes?: string;
  fill?: boolean;
  className?: string;
};

export default function ZoomImage({ src, alt, width, height, sizes, fill, className }: Props) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const opener = openerRef.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    // Stop the page behind from scrolling while the photo is up.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      opener?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={openerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`View larger: ${alt}`}
        className={clsx("block cursor-zoom-in", fill ? "absolute inset-0 h-full w-full" : "h-full w-full")}
      >
        {fill ? (
          <Image src={src} alt={alt} fill sizes={sizes} className={className} />
        ) : (
          <Image src={src} alt={alt} width={width} height={height} sizes={sizes} className={className} />
        )}
      </button>

      {open &&
        createPortal(
          <div
            className="lightbox-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-label={alt}
            onClick={() => setOpen(false)}
          >
            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-white"
            >
              <X size={22} />
            </button>
            <Image
              src={src}
              alt={alt}
              width={width}
              height={height}
              sizes="95vw"
              quality={85}
              onClick={(e) => e.stopPropagation()}
              className="lightbox-photo max-h-[86vh] w-auto max-w-[95vw] rounded-2xl object-contain shadow-2xl"
            />
          </div>,
          document.body
        )}
    </>
  );
}
