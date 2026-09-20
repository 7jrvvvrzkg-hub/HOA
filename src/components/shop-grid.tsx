"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { QuickViewModal } from "@/components/quick-view-modal";
import { track } from "@/lib/track";
import type { Product } from "@/lib/types";

export function ShopGrid({
  products,
  category,
  heading,
}: {
  products: Product[];
  category?: string;
  heading?: string;
}) {
  const [quickView, setQuickView] = useState<Product | null>(null);
  const [sort, setSort] = useState<"newest" | "price-asc" | "price-desc" | "most-loved">("newest");

  useEffect(() => {
    track({ eventType: "category_view", category: category ?? "all" });
  }, [category]);

  const mostLikedIds = useMemo(() => {
    return new Set(
      [...products]
        .sort((a, b) => b.likeCount - a.likeCount)
        .slice(0, 3)
        .filter((p) => p.likeCount > 0)
        .map((p) => p.id)
    );
  }, [products]);

  const sorted = useMemo(() => {
    const copy = [...products];
    switch (sort) {
      case "price-asc":
        return copy.sort((a, b) => (a.priceCents || Infinity) - (b.priceCents || Infinity));
      case "price-desc":
        return copy.sort((a, b) => b.priceCents - a.priceCents);
      case "most-loved":
        return copy.sort((a, b) => b.likeCount - a.likeCount);
      default:
        return copy.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    }
  }, [products, sort]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        {heading && <h1 className="font-display text-3xl">{heading}</h1>}
        <div className="ml-auto flex items-center gap-2 text-sm">
          <label htmlFor="sort" className="text-ink-soft">
            Sort
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="rounded-full border border-line bg-cloud px-3 py-1.5 outline-none focus:border-pop"
          >
            <option value="newest">Newest</option>
            <option value="most-loved">Most-loved</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line py-16 text-center text-ink-soft">
          No pieces here yet — check back soon, new arrivals are added weekly.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {sorted.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              trending={mostLikedIds.has(p.id)}
              onQuickView={setQuickView}
            />
          ))}
        </div>
      )}

      <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />
    </div>
  );
}
