"use client";

import { useState } from "react";
import Link from "next/link";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/store/cart";
import { ProductImage } from "@/components/product-image";
import { formatPrice } from "@/lib/format";

export default function CartPage() {
  const { items, setQuantity, removeItem, totalCents } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.message ?? "Checkout isn't fully wired up yet.");
      }
    } catch {
      setError("Something went wrong reaching checkout — try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
        <ShoppingBag className="mx-auto mb-4 h-10 w-10 text-ink-soft" />
        <h1 className="font-display text-2xl">Your bag is empty</h1>
        <p className="mt-2 text-ink-soft">Nothing here yet — let&apos;s fix that.</p>
        <Link
          href="/shop"
          className="mt-6 inline-block rounded-full bg-pop px-6 py-3 text-sm font-semibold text-cream shadow-pop"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="mb-8 font-display text-3xl">Your bag</h1>

      <ul className="flex flex-col gap-6">
        {items.map((item) => (
          <li key={item.productId} className="flex gap-4 border-b border-line pb-6">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl">
              <ProductImage
                images={item.image ? [{ url: item.image }] : []}
                alt={item.name}
                className="absolute inset-0"
              />
            </div>
            <div className="flex flex-1 flex-col">
              <Link href={`/product/${item.slug}`} className="font-display text-lg hover:text-pop">
                {item.name}
              </Link>
              <span className="text-ink-soft">{formatPrice(item.priceCents)}</span>
              <div className="mt-auto flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-full border border-line px-2 py-1">
                  <button
                    onClick={() => setQuantity(item.productId, item.quantity - 1)}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-5 text-center text-sm">{item.quantity}</span>
                  <button
                    onClick={() => setQuantity(item.productId, item.quantity + 1)}
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button onClick={() => removeItem(item.productId)} className="text-xs text-ink-soft underline">
                  Remove
                </button>
              </div>
            </div>
            <div className="font-medium">{formatPrice(item.priceCents * item.quantity)}</div>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-col items-end gap-3">
        <div className="flex w-full max-w-xs justify-between text-lg">
          <span>Subtotal</span>
          <span className="font-semibold">{formatPrice(totalCents())}</span>
        </div>
        <p className="text-right text-xs text-ink-soft">Shipping and any applicable tax calculated at checkout.</p>
        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full max-w-xs rounded-full bg-pop py-3.5 text-sm font-semibold text-cream shadow-pop transition hover:bg-pop-dark disabled:opacity-60"
        >
          {loading ? "Redirecting to checkout…" : "Checkout with Stripe"}
        </button>
        {error && <p className="max-w-xs text-right text-xs text-ink-soft">{error}</p>}
      </div>
    </div>
  );
}
