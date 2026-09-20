"use client";

import Link from "next/link";
import { X, Minus, Plus, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/store/cart";
import { ProductImage } from "@/components/product-image";
import { formatPrice } from "@/lib/format";

export function CartDrawer() {
  const { items, isOpen, close, setQuantity, removeItem, totalCents } = useCart();

  return (
    <div
      className={`fixed inset-0 z-50 ${isOpen ? "" : "pointer-events-none"}`}
      aria-hidden={!isOpen}
    >
      <div
        className={`absolute inset-0 bg-ink/40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={close}
      />
      <div
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-cream shadow-soft transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="flex items-center gap-2 font-display text-xl">
            <ShoppingBag className="h-5 w-5" /> Your bag
          </h2>
          <button onClick={close} aria-label="Close bag" className="rounded-full p-2 hover:bg-cream-soft">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <p className="mt-10 text-center text-sm text-ink-soft">Your bag is empty — go find something wonderful.</p>
          ) : (
            <ul className="flex flex-col gap-5">
              {items.map((item) => (
                <li key={item.productId} className="flex gap-3">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl">
                    <ProductImage
                      images={item.image ? [{ url: item.image }] : []}
                      alt={item.name}
                      className="absolute inset-0"
                    />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <span className="text-sm font-medium leading-snug">{item.name}</span>
                    <span className="text-sm text-ink-soft">{formatPrice(item.priceCents)}</span>
                    <div className="mt-auto flex items-center gap-2">
                      <button
                        onClick={() => setQuantity(item.productId, item.quantity - 1)}
                        className="rounded-full border border-line p-1 hover:border-pop"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-5 text-center text-sm">{item.quantity}</span>
                      <button
                        onClick={() => setQuantity(item.productId, item.quantity + 1)}
                        className="rounded-full border border-line p-1 hover:border-pop"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="ml-2 text-xs text-ink-soft underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-line px-5 py-4">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-ink-soft">Subtotal</span>
              <span className="font-semibold">{formatPrice(totalCents())}</span>
            </div>
            <Link
              href="/cart"
              onClick={close}
              className="block w-full rounded-full bg-pop py-3.5 text-center text-sm font-semibold text-cream shadow-pop transition hover:bg-pop-dark"
            >
              View bag &amp; checkout
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
