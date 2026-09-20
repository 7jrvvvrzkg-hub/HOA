import { ShopGrid } from "@/components/shop-grid";
import { getAllProducts } from "@/lib/data/products";

export const metadata = { title: "Shop" };

export default async function ShopPage({
  searchParams,
}: PageProps<"/shop">) {
  const { q } = await searchParams;
  const all = await getAllProducts();

  const query = typeof q === "string" ? q.trim().toLowerCase() : "";
  const products = query
    ? all.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query)
      )
    : all;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <ShopGrid
        products={products}
        heading={query ? `Results for “${q}”` : "Shop everything"}
      />
    </div>
  );
}
