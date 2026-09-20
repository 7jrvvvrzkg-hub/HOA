import Link from "next/link";
import { Hero } from "@/components/hero";
import { MusicStaffDivider } from "@/components/music-staff-divider";
import { HomeGridSection } from "@/components/home-grid-section";
import { getMostLiked, getNewArrivals, getAllProducts } from "@/lib/data/products";
import { CATEGORIES, slugFromCategory } from "@/lib/categories";

export default async function HomePage() {
  const [newArrivals, mostLiked, all] = await Promise.all([
    getNewArrivals(),
    getMostLiked(8),
    getAllProducts(),
  ]);

  const featured = newArrivals.length ? newArrivals : all.slice(0, 8);

  return (
    <div>
      <Hero />

      <div className="mx-auto flex max-w-7xl gap-4 px-4 py-16 sm:px-6 lg:px-8">
        <MusicStaffDivider className="hidden sm:flex" />

        <div className="min-w-0 flex-1">
          <HomeGridSection
            title="New Arrivals"
            subtitle="Just added — see it, love it, it won't last."
            href="/shop/new-arrivals"
            products={featured}
          />

          <div className="my-16 h-px bg-line" />

          <HomeGridSection
            title="Most-Loved"
            subtitle="What everyone's clicking, liking, and adding to their bag."
            href="/shop"
            products={mostLiked}
            trending
          />
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <h2 className="mb-6 font-display text-2xl">Shop by category</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CATEGORIES.map((c) => (
            <Link
              key={c}
              href={`/shop/${slugFromCategory(c)}`}
              className="rounded-2xl border border-line bg-cloud px-5 py-6 text-center font-display text-lg transition hover:-translate-y-0.5 hover:border-pop hover:shadow-soft"
            >
              {c}
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-cream-soft py-16">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
          <div>
            <h2 className="font-display text-3xl italic">A little about us</h2>
            <p className="mt-4 max-w-md text-ink-soft">
              Embellish Antiques is a Durham, NC-based dealer specializing in curated,
              one-of-a-kind antique and vintage pieces — from Art Deco barware to
              monumental French lighting. Every item is personally sourced and
              hand-picked before it ever reaches the shop floor.
            </p>
            <Link
              href="/about"
              className="mt-5 inline-block rounded-full border border-forest px-6 py-3 text-sm font-semibold text-forest transition hover:bg-forest hover:text-cream"
            >
              Read our story
            </Link>
          </div>
          <div className="rounded-3xl bg-forest p-8 text-cream">
            <p className="font-display text-xl italic leading-relaxed">
              &ldquo;Every piece has already lived a life before it finds you — we just help
              it find the right home next.&rdquo;
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
