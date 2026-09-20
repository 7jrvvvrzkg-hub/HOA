import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { CATEGORY_LIST } from "@/lib/categories";

/**
 * Popped-color hero built to carry the page without relying on product
 * photography (there isn't much yet). A custom CSS/SVG antique composition
 * — urn silhouette, floating laurel sprigs, a soft glow — animates gently
 * behind the headline, and a marquee of category names runs underneath for
 * texture. Swap in real hero photography later without touching layout.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden rounded-b-[2.5rem] bg-forest text-cream sm:rounded-b-[3.5rem]">
      <div className="pointer-events-none absolute inset-0 opacity-90">
        <div className="absolute -left-16 top-10 h-72 w-72 rounded-full bg-pop/30 blur-3xl" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-gold/20 blur-3xl" />
      </div>

      {/* Custom antique animation: a drifting urn silhouette with orbiting sparkle motes */}
      <div
        className="pointer-events-none absolute -right-10 top-8 hidden h-80 w-80 text-cream/90 sm:block md:right-6 md:h-96 md:w-96"
        style={{ animation: "float-slow 7s ease-in-out infinite" }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 200 200" fill="none" className="h-full w-full drop-shadow-[0_20px_40px_rgba(0,0,0,0.25)]">
          <ellipse cx="100" cy="182" rx="46" ry="8" fill="black" opacity="0.15" />
          <path
            d="M74 40h52v14c0 7 4 10 8 15 7 8 12 18 12 32 0 27-19 45-46 45s-46-18-46-45c0-14 5-24 12-32 4-5 8-8 8-15V40Z"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path d="M74 40h52" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M64 96c8 7 20 11 36 11s28-4 36-11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
          <path d="M64 116c8 7 20 11 36 11s28-4 36-11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.5" />
          {[
            [30, 60], [170, 50], [20, 140], [180, 130], [100, 20],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r={i % 2 === 0 ? 2.4 : 1.6} fill="#c69a3a" opacity="0.8" />
          ))}
        </svg>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-cream/25 bg-cream/10 px-4 py-1.5 text-xs font-medium tracking-wide backdrop-blur">
          <LogoMark className="h-3.5 w-3.5" /> Durham, NC · Shipping nationwide &amp; worldwide
        </div>

        <h1 className="mt-6 max-w-2xl font-display text-4xl italic leading-[1.05] sm:text-6xl">
          Beautifully <span className="text-pop">peculiar</span> antiques, found and re-homed.
        </h1>

        <p className="mt-5 max-w-lg text-base text-cream/80 sm:text-lg">
          Every piece is hand-selected, one of a kind, and won&apos;t come around twice —
          from Art Deco barware to monumental French lanterns.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/shop/new-arrivals"
            className="rounded-full bg-pop px-6 py-3 text-sm font-semibold text-cream shadow-pop transition hover:bg-pop-dark"
          >
            Shop New Arrivals
          </Link>
          <Link
            href="/about"
            className="rounded-full border border-cream/40 px-6 py-3 text-sm font-semibold text-cream transition hover:border-cream hover:bg-cream/10"
          >
            Our Story
          </Link>
        </div>
      </div>

      <div className="relative overflow-hidden border-t border-cream/10 py-3">
        <div className="flex w-max gap-10 whitespace-nowrap text-xs font-medium uppercase tracking-[0.3em] text-cream/50" style={{ animation: "marquee 28s linear infinite" }}>
          {[...CATEGORY_LIST, ...CATEGORY_LIST].map((c, i) => (
            <span key={i}>{c.label}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
