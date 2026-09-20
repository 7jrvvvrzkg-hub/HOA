import { notFound } from "next/navigation";
import { ShopGrid } from "@/components/shop-grid";
import { getAllProducts, getNewArrivals, getProductsByCategory } from "@/lib/data/products";
import { categoryFromSlug } from "@/lib/categories";

export async function generateMetadata({ params }: PageProps<"/shop/[category]">) {
  const { category } = await params;
  if (category === "new-arrivals") return { title: "New Arrivals" };
  const label = categoryFromSlug(category);
  return { title: label ?? "Shop" };
}

export default async function CategoryPage({ params }: PageProps<"/shop/[category]">) {
  const { category: slug } = await params;

  if (slug === "new-arrivals") {
    const products = await getNewArrivals();
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <ShopGrid products={products} category="new-arrivals" heading="New Arrivals" />
      </div>
    );
  }

  const label = categoryFromSlug(slug);
  if (!label) {
    // Not a real category slug — fall back to treating it as "no matches"
    // rather than a hard 404, since old Wix URLs may still be floating
    // around (e.g. the Fireplace category lived at /blank-page there).
    const all = await getAllProducts();
    if (!all.length) notFound();
  }

  const products = label ? await getProductsByCategory(label) : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <ShopGrid products={products} category={label ?? slug} heading={label ?? "Shop"} />
    </div>
  );
}
