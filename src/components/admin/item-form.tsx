"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProduct, updateProduct } from "@/lib/data/admin-actions";
import { CATEGORIES } from "@/lib/categories";
import type { Product } from "@/lib/types";

export function ItemForm({ product }: { product?: Product }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setMessage(null);
    const result = product ? await updateProduct(product.id, formData) : await createProduct(formData);
    setPending(false);
    if (result.ok) {
      setMessage("Saved.");
      if (!product) router.push("/admin/items");
    } else {
      setMessage(result.message ?? "Something went wrong.");
    }
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink-soft">
          Name
        </label>
        <input
          name="name"
          required
          defaultValue={product?.name}
          className="w-full rounded-xl border border-line bg-cloud px-4 py-2.5 text-sm outline-none focus:border-pop"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink-soft">
            Category
          </label>
          <select
            name="category"
            required
            defaultValue={product?.category}
            className="w-full rounded-xl border border-line bg-cloud px-4 py-2.5 text-sm outline-none focus:border-pop"
          >
            <option value="" disabled>
              Choose…
            </option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink-soft">
            Price (USD, 0 = price upon request)
          </label>
          <input
            name="price"
            type="number"
            min="0"
            step="0.01"
            defaultValue={product ? (product.priceCents / 100).toFixed(2) : undefined}
            className="w-full rounded-xl border border-line bg-cloud px-4 py-2.5 text-sm outline-none focus:border-pop"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink-soft">
          Description
        </label>
        <textarea
          name="description"
          rows={4}
          defaultValue={product?.description}
          className="w-full rounded-xl border border-line bg-cloud px-4 py-2.5 text-sm outline-none focus:border-pop"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink-soft">Era</label>
          <input name="era" defaultValue={product?.era} className="w-full rounded-xl border border-line bg-cloud px-3 py-2 text-sm outline-none focus:border-pop" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink-soft">Materials</label>
          <input name="materials" defaultValue={product?.materials} className="w-full rounded-xl border border-line bg-cloud px-3 py-2 text-sm outline-none focus:border-pop" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink-soft">Condition</label>
          <input name="condition" defaultValue={product?.condition} className="w-full rounded-xl border border-line bg-cloud px-3 py-2 text-sm outline-none focus:border-pop" />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink-soft">
          Dimensions (include e.g. 30H for the size-reference tool to work)
        </label>
        <input
          name="dimensions"
          placeholder={'34"W x 22"D x 30"H'}
          defaultValue={product?.dimensions}
          className="w-full rounded-xl border border-line bg-cloud px-4 py-2.5 text-sm outline-none focus:border-pop"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isNewArrival" defaultChecked={product?.isNewArrival} className="h-4 w-4" />
        Mark as New Arrival
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-pop px-6 py-3 text-sm font-semibold text-cream shadow-pop disabled:opacity-60"
        >
          {pending ? "Saving…" : product ? "Save changes" : "Create item"}
        </button>
        {message && <span className="text-sm text-ink-soft">{message}</span>}
      </div>
    </form>
  );
}
