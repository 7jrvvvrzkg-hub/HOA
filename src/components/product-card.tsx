"use client";

import Link from "next/link";
import { Eye, Flame } from "lucide-react";
import { ProductImage } from "@/components/product-image";
import { LikeButton } from "@/components/like-button";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";

export function ProductCard({
  product,
  trending = false,
  onQuickView,
}: {
  product: Product;
  trending?: boolean;
  onQuickView?: (product: Product) => void;
}) {
  const sold = product.status === "sold";

  return (
    <div className="group relative flex flex-col">
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden rounded-2xl">
          <ProductImage images={product.images} alt={product.name} className="absolute inset-0" />

          {sold && (
            <span className="absolute left-3 top-3 rounded-full bg-ink px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-widest text-cream">
              Sold
            </span>
          )}
          {!sold && product.isNewArrival && (
            <span className="absolute left-3 top-3 rounded-full bg-forest px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-widest text-cream">
              New
            </span>
          )}
          {!sold && trending && (
            <span className="absolute left-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-cloud/90 px-2.5 py-1 text-[0.65rem] font-semibold text-pop shadow-soft backdrop-blur">
              <Flame className="h-3 w-3 fill-pop" /> Most-loved this week
            </span>
          )}

          <div className="absolute right-3 top-3">
            <LikeButton productId={product.id} initialCount={product.likeCount} size="sm" />
          </div>

          {onQuickView && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onQuickView(product);
              }}
              className="absolute inset-x-3 bottom-3 flex translate-y-2 items-center justify-center gap-1.5 rounded-full bg-ink/85 py-2 text-xs font-semibold text-cream opacity-0 backdrop-blur transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100"
            >
              <Eye className="h-3.5 w-3.5" /> Quick view
            </button>
          )}
        </div>
      </Link>

      <Link href={`/product/${product.slug}`} className="mt-3 flex flex-col gap-0.5">
        <span className="text-[0.7rem] uppercase tracking-widest text-ink-soft">
          {product.category}
        </span>
        <span className="font-display text-base leading-snug text-ink">{product.name}</span>
        <span className="mt-0.5 text-sm font-medium text-pop-dark">
          {product.priceCents > 0 ? formatPrice(product.priceCents) : "Price upon request"}
        </span>
      </Link>
    </div>
  );
}
