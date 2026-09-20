"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { ProductImage } from "@/components/product-image";
import { AddToBagButton } from "@/components/add-to-bag-button";
import { LikeButton } from "@/components/like-button";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";

export function QuickViewModal({ product, onClose }: { product: Product | null; onClose: () => void }) {
  useEffect(() => {
    if (!product) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [product, onClose]);

  if (!product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-6">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative grid w-full max-w-2xl grid-cols-1 gap-0 overflow-hidden rounded-t-3xl bg-cloud shadow-soft sm:grid-cols-2 sm:rounded-3xl">
        <button
          onClick={onClose}
          aria-label="Close quick view"
          className="absolute right-3 top-3 z-10 rounded-full bg-cloud/90 p-2 shadow-soft"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative aspect-square sm:aspect-auto">
          <ProductImage images={product.images} alt={product.name} className="absolute inset-0" />
        </div>

        <div className="flex flex-col gap-3 p-6">
          <span className="text-[0.7rem] uppercase tracking-widest text-ink-soft">{product.category}</span>
          <h3 className="font-display text-2xl leading-tight">{product.name}</h3>
          <p className="text-lg font-medium text-pop-dark">
            {product.priceCents > 0 ? formatPrice(product.priceCents) : "Price upon request"}
          </p>
          <p className="line-clamp-4 text-sm text-ink-soft">{product.description}</p>
          <div className="mt-2 flex items-center gap-3">
            <AddToBagButton product={product} className="flex-1" />
            <LikeButton productId={product.id} initialCount={product.likeCount} />
          </div>
          <Link
            href={`/product/${product.slug}`}
            className="mt-1 text-center text-sm font-medium text-forest underline underline-offset-4"
          >
            View full details
          </Link>
        </div>
      </div>
    </div>
  );
}
