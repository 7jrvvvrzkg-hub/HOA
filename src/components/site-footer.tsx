"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import { Logo } from "@/components/logo";
import { CATEGORY_LIST } from "@/lib/categories";

export function SiteFooter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <footer className="mt-24 border-t border-line bg-forest text-cream">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-5 lg:px-8">
        <div className="lg:col-span-2">
          <Logo className="text-cream" />
          <p className="mt-4 max-w-xs text-sm text-cream/70">
            One-of-a-kind antiques and vintage pieces, sourced and shipped from our
            Durham, NC warehouse — nationwide and worldwide.
          </p>
          <div className="mt-4 flex gap-3">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="rounded-full border border-cream/30 p-2 transition hover:border-pop hover:text-pop"
            >
              <InstagramGlyph className="h-4 w-4" />
            </a>
            <a
              href="mailto:hello@embellishantiques.com"
              aria-label="Email"
              className="rounded-full border border-cream/30 p-2 transition hover:border-pop hover:text-pop"
            >
              <Mail className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-cream/60">Shop</p>
          <ul className="mt-4 space-y-2 text-sm">
            {CATEGORY_LIST.slice(0, 6).map((c) => (
              <li key={c.slug}>
                <Link href={`/shop/${c.slug}`} className="text-cream/80 transition hover:text-pop">
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-cream/60">Visit us</p>
          <ul className="mt-4 space-y-2.5 text-sm text-cream/80">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-soft" /> Durham, NC — by appointment
            </li>
            <li>Ships nationwide &amp; worldwide</li>
          </ul>
          <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-cream/60">Info</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/about" className="text-cream/80 transition hover:text-pop">About</Link></li>
            <li><Link href="/sold-archive" className="text-cream/80 transition hover:text-pop">Sold Archive</Link></li>
            <li><Link href="/shipping-returns" className="text-cream/80 transition hover:text-pop">Shipping &amp; Returns</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-cream/60">Get in touch</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <a href="tel:+19199718743" className="flex items-center gap-2 text-cream/80 transition hover:text-pop">
                <Phone className="h-3.5 w-3.5 shrink-0 text-gold-soft" /> (919) 971-8743
              </a>
            </li>
            <li>
              <a
                href="mailto:hello@embellishantiques.com"
                className="flex items-center gap-2 text-cream/80 transition hover:text-pop"
              >
                <Mail className="h-3.5 w-3.5 shrink-0 text-gold-soft" /> hello@embellishantiques.com
              </a>
            </li>
            <li>
              <Link href="/contact" className="text-cream/80 transition hover:text-pop">
                Send a message →
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-cream/10">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-cream/15 bg-cream/5 px-6 py-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-cream/60">Join the list</p>
              <p className="mt-1 text-sm text-cream/70">
                New arrivals and one-of-a-kind finds, straight to your inbox.
              </p>
            </div>
            {status === "done" ? (
              <p className="text-sm text-gold-soft">You&apos;re on the list — thank you!</p>
            ) : (
              <form onSubmit={handleSubscribe} className="flex w-full max-w-sm gap-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="w-full rounded-full border border-cream/30 bg-transparent px-4 py-2 text-sm placeholder:text-cream/40 outline-none focus:border-pop"
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="shrink-0 rounded-full bg-pop px-4 py-2 text-sm font-semibold text-cream transition hover:bg-pop-dark disabled:opacity-60"
                >
                  Join
                </button>
              </form>
            )}
          </div>
          {status === "error" && (
            <p className="mt-2 text-xs text-cream/60">Something went wrong — try again in a moment.</p>
          )}
        </div>
      </div>

      <div className="border-t border-cream/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-cream/50 sm:flex-row sm:px-6 lg:px-8">
          <span>© {new Date().getFullYear()} Embellish Antiques. All rights reserved.</span>
          <span>
            Made by{" "}
            <a
              href="https://bownode.com"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-cream/80 underline decoration-gold-soft underline-offset-2 transition hover:text-pop"
            >
              Bownode LLC
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}

// lucide-react dropped brand icons, so this is a tiny hand-drawn stand-in —
// keeps the footer from depending on a brand-icon package for one glyph.
function InstagramGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
    </svg>
  );
}
