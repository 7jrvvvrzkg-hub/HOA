import { notFound } from "next/navigation";
import { ItemForm } from "@/components/admin/item-form";
import { ImageManager } from "@/components/admin/image-manager";
import { getAllProductsForAdmin } from "@/lib/data/products";

export const metadata = { title: "Edit Item" };

export default async function EditItemPage({ params }: PageProps<"/admin/items/[id]">) {
  const { id } = await params;
  const products = await getAllProductsForAdmin();
  const product = products.find((p) => p.id === id);
  if (!product) notFound();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 font-display text-3xl">{product.name}</h1>

      <div className="mb-8">
        <ImageManager productId={product.id} images={product.images} />
      </div>

      <ItemForm product={product} />
    </div>
  );
}
