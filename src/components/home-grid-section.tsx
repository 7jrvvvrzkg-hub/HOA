"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { QuickViewModal } from "@/components/quick-view-modal";
import type { Product } from "@/lib/types";

export function HomeGridSection({
  title,
  subtitle,
  href,
  products,
  trending = false,
}: {
  title: string;
  subtitle: string;
  href: string;
  products: Product[];
  trending?: boolean;
}) {
  const [quickView, setQuickView] = useState<Product | null>(null);

  if (!products.length) return null;

  return (
    <section>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="font-display text-2xl">{title}</h2>
          <p className="text-sm text-ink-soft">{subtitle}</p>
        </div>
        <Link href={href} className="flex items-center gap-1 text-sm font-semibold text-pop-dark">
          See all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        {products.slice(0, 8).map((p) => (
          <ProductCard key={p.id} product={p} trending={trending} onQuickView={setQuickView} />
        ))}
      </div>
      <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />
    </section>
  );
}
