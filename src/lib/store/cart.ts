"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLineItem } from "@/lib/types";

interface CartState {
  items: CartLineItem[];
  isOpen: boolean;
  lastAddedId: string | null;
  addItem: (item: Omit<CartLineItem, "quantity">) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  totalCents: () => number;
  totalCount: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      lastAddedId: null,

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId);
          const items = existing
            ? state.items.map((i) =>
                i.productId === item.productId ? { ...i, quantity: i.quantity + 1 } : i
              )
            : [...state.items, { ...item, quantity: 1 }];
          return { items, lastAddedId: item.productId };
        }),

      removeItem: (productId) =>
        set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),

      setQuantity: (productId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.productId !== productId)
              : state.items.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
        })),

      clear: () => set({ items: [] }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),

      totalCents: () => get().items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0),
      totalCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: "embellish-cart",
      // Only the bag's contents should survive a reload — not whether the
      // drawer happened to be open, or which item was most recently added.
      // Without this, closing the tab mid-checkout with the drawer open
      // would leave it popped open on every future visit until closed again.
      partialize: (state) => ({ items: state.items }),
    }
  )
);
