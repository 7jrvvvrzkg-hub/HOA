"use client";

import { useMemo, useState } from "react";
import { ProductImage } from "@/components/product-image";
import { formatPrice } from "@/lib/format";
import { sendNewsletter } from "@/lib/data/admin-newsletter-actions";
import type { Product } from "@/lib/types";

export function NewsletterComposer({ products }: { products: Product[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState("New arrivals you'll love");
  const [intro, setIntro] = useState("A few new pieces just found their way into the shop.");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const selectedProducts = useMemo(
    () => products.filter((p) => selected.has(p.id)),
    [products, selected]
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSend(formData: FormData) {
    setPending(true);
    setResult(null);
    const res = await sendNewsletter(formData);
    setResult(res);
    setPending(false);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-soft">
          1. Pick items to feature
        </p>
        <div className="grid max-h-[480px] grid-cols-2 gap-3 overflow-y-auto rounded-2xl border border-line bg-cloud p-3 sm:grid-cols-3">
          {products.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className={`relative overflow-hidden rounded-xl border-2 text-left transition ${
                selected.has(p.id) ? "border-pop" : "border-transparent"
              }`}
            >
              <div className="relative aspect-square">
                <ProductImage images={p.images} alt={p.name} className="absolute inset-0" />
              </div>
              <div className="bg-cream-soft p-2">
                <p className="truncate text-xs font-medium">{p.name}</p>
                <p className="text-[0.65rem] text-ink-soft">
                  {p.priceCents > 0 ? formatPrice(p.priceCents) : "POR"}
                </p>
              </div>
              {selected.has(p.id) && (
                <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-pop text-xs font-bold text-cream shadow-soft ring-2 ring-cream">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-soft">
          2. Write it up &amp; send
        </p>
        <form action={handleSend} className="flex flex-col gap-3 rounded-2xl border border-line bg-cloud p-4">
          {selectedProducts.map((p) => (
            <input key={p.id} type="hidden" name="productIds" value={p.id} />
          ))}
          <input
            name="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject line"
            className="rounded-xl border border-line bg-cream px-3 py-2 text-sm outline-none focus:border-pop"
          />
          <textarea
            name="intro"
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            rows={3}
            placeholder="A short intro line"
            className="rounded-xl border border-line bg-cream px-3 py-2 text-sm outline-none focus:border-pop"
          />
          <p className="text-xs text-ink-soft">{selectedProducts.length} item(s) selected</p>
          <button
            type="submit"
            disabled={pending || selectedProducts.length === 0}
            className="rounded-full bg-pop py-3 text-sm font-semibold text-cream shadow-pop disabled:opacity-60"
          >
            {pending ? "Sending…" : "Generate & send to subscribers"}
          </button>
          {result && (
            <p className={`text-sm ${result.ok ? "text-forest" : "text-ink-soft"}`}>{result.message}</p>
          )}
        </form>
      </div>
    </div>
  );
}
