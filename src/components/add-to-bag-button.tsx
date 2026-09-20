"use client";

import { useState } from "react";
import { ShoppingBag, Check } from "lucide-react";
import { useCart } from "@/lib/store/cart";
import type { Product } from "@/lib/types";

interface Particle {
  id: number;
  left: number;
  drift: number;
  delay: number;
  size: number;
  color: string;
}

const COLORS = ["#e2551f", "#c69a3a", "#2f4a3c"];

/**
 * "Shower of items in bags": clicking Add to Bag sends a little burst of
 * particles falling off the button, then settles into a checkmark — a
 * playful nod at items tumbling into the bag rather than a plain toast.
 */
export function AddToBagButton({ product, className = "" }: { product: Product; className?: string }) {
  const addItem = useCart((s) => s.addItem);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [justAdded, setJustAdded] = useState(false);

  function handleClick() {
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      priceCents: product.priceCents,
      image: product.images[0]?.url ?? "",
    });

    const burst: Particle[] = Array.from({ length: 10 }).map((_, i) => ({
      id: Date.now() + i,
      left: 10 + Math.random() * 80,
      drift: (Math.random() - 0.5) * 60,
      delay: Math.random() * 0.15,
      size: 5 + Math.random() * 5,
      color: COLORS[i % COLORS.length],
    }));
    setParticles(burst);
    setJustAdded(true);
    setTimeout(() => setParticles([]), 900);
    setTimeout(() => setJustAdded(false), 1600);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        disabled={product.status === "sold"}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-full bg-pop px-6 py-3.5 text-sm font-semibold text-cream shadow-pop transition hover:bg-pop-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-ink-soft disabled:shadow-none ${className}`}
      >
        {product.status === "sold" ? (
          "Sold"
        ) : justAdded ? (
          <>
            <Check className="h-4 w-4" /> Added to bag
          </>
        ) : (
          <>
            <ShoppingBag className="h-4 w-4" /> Add to bag
          </>
        )}
      </button>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-0 overflow-visible">
        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute top-0 block rounded-sm"
            style={
              {
                left: `${p.left}%`,
                width: p.size,
                height: p.size,
                background: p.color,
                "--drift": `${p.drift}px`,
                animation: `shower-fall 0.75s ease-in ${p.delay}s forwards`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
