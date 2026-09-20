import { ProductCard } from "@/components/product-card";
import { getSoldArchive } from "@/lib/data/products";

export const metadata = { title: "Sold Archive" };

export default async function SoldArchivePage() {
  const sold = await getSoldArchive();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl">Sold Archive</h1>
      <p className="mt-2 max-w-xl text-ink-soft">
        A running record of pieces that have already found their next home — kept up as a look
        at what tends to come through Embellish Antiques.
      </p>

      {sold.length === 0 ? (
        <p className="mt-12 rounded-2xl border border-dashed border-line py-16 text-center text-ink-soft">
          Nothing archived yet — sold pieces will collect here automatically once the admin
          panel marks an item as sold.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {sold.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
