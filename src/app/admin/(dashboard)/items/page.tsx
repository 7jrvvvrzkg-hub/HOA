import Link from "next/link";
import { Plus } from "lucide-react";
import { ProductImage } from "@/components/product-image";
import { StatusButtons } from "@/components/admin/status-buttons";
import { formatPrice } from "@/lib/format";
import { getAllProductsForAdmin } from "@/lib/data/products";

export const metadata = { title: "Items" };

export default async function AdminItemsPage() {
  const products = await getAllProductsForAdmin();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl sm:text-3xl">Items</h1>
        <Link
          href="/admin/items/new"
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-pop px-4 py-2.5 text-sm font-semibold text-cream shadow-pop"
        >
          <Plus className="h-4 w-4" /> Add item
        </Link>
      </div>

      <div className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-cloud">
        {products.map((p) => (
          <div key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                <ProductImage images={p.images} alt={p.name} className="absolute inset-0" />
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/admin/items/${p.id}`} className="block truncate font-medium hover:text-pop">
                  {p.name}
                </Link>
                <p className="text-xs text-ink-soft">
                  {p.category} · {p.priceCents > 0 ? formatPrice(p.priceCents) : "Price upon request"}
                </p>
              </div>
            </div>
            <StatusButtons product={p} />
          </div>
        ))}
      </div>
    </div>
  );
}
