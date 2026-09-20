"use client";

import { useTransition } from "react";
import { setProductStatus, deleteProduct } from "@/lib/data/admin-actions";
import type { Product } from "@/lib/types";

export function StatusButtons({ product }: { product: Product }) {
  const [pending, startTransition] = useTransition();

  function setStatus(status: "available" | "sold" | "draft") {
    startTransition(async () => {
      await setProductStatus(product.id, status);
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${product.name}"? This can't be undone.`)) return;
    startTransition(async () => {
      await deleteProduct(product.id);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {(["available", "sold", "draft"] as const).map((s) => (
        <button
          key={s}
          disabled={pending}
          onClick={() => setStatus(s)}
          className={`min-h-9 rounded-full px-3.5 py-2 font-medium capitalize transition ${
            product.status === s ? "bg-forest text-cream" : "bg-cream-soft text-ink-soft hover:bg-line active:bg-line"
          }`}
        >
          {s}
        </button>
      ))}
      <button
        disabled={pending}
        onClick={handleDelete}
        className="min-h-9 rounded-full px-3.5 py-2 font-medium text-pop-dark hover:bg-pop/10 active:bg-pop/10"
      >
        Delete
      </button>
    </div>
  );
}
