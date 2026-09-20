"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { getLikedIds } from "@/lib/liked-ids";
import type { Product } from "@/lib/types";

// Likes are stored per-visitor in this browser's localStorage (there's no
// account system), so this page reads the liked ids client-side and asks
// the server which products those still are — the same list is what
// LikeButton reads/writes, so anything liked anywhere on the site shows up
// here, and stays here after a reload.
export default function LikesPage() {
  const [status, setStatus] = useState<"loading" | "empty" | "ready">("loading");
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const ids = [...getLikedIds()];
    if (!ids.length) {
      setStatus("empty");
      return;
    }
    fetch(`/api/products/by-ids?ids=${ids.join(",")}`)
      .then((res) => res.json())
      .then((data: { products: Product[] }) => {
        setProducts(data.products ?? []);
        setStatus((data.products ?? []).length ? "ready" : "empty");
      })
      .catch(() => setStatus("empty"));
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-2.5">
        <Heart className="h-6 w-6 fill-pop text-pop" />
        <h1 className="font-display text-3xl">Your likes</h1>
      </div>

      {status === "loading" && <p className="text-sm text-ink-soft">Loading…</p>}

      {status === "empty" && (
        <div className="rounded-3xl border border-line bg-cloud px-6 py-16 text-center">
          <p className="text-ink-soft">
            Nothing liked yet — tap the heart on any piece to save it here. It&apos;ll stay saved on
            this device even after you close the tab.
          </p>
          <Link
            href="/shop"
            className="mt-5 inline-flex rounded-full bg-pop px-6 py-3 text-sm font-semibold text-cream shadow-pop"
          >
            Browse the shop
          </Link>
        </div>
      )}

      {status === "ready" && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
