import { notFound } from "next/navigation";
import Link from "next/link";
import { ProductImage } from "@/components/product-image";
import { LikeButton } from "@/components/like-button";
import { AddToBagButton } from "@/components/add-to-bag-button";
import { SizeReference } from "@/components/size-reference";
import { NotifySimilar } from "@/components/notify-similar";
import { ProductViewTracker } from "@/components/product-view-tracker";
import { ProductCard } from "@/components/product-card";
import { formatPrice } from "@/lib/format";
import { getAllProducts, getProductBySlug, getProductsByCategory } from "@/lib/data/products";
import { slugFromCategory } from "@/lib/categories";

export async function generateMetadata({ params }: PageProps<"/product/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.description,
  };
}

export default async function ProductPage({ params }: PageProps<"/product/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = (await getProductsByCategory(product.category))
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  const details = [
    ["Era", product.era],
    ["Materials", product.materials],
    ["Dimensions", product.dimensions],
    ["Condition", product.condition],
  ].filter(([, value]) => Boolean(value)) as [string, string][];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <ProductViewTracker productId={product.id} />

      <nav className="mb-6 flex flex-wrap items-center gap-1 text-xs text-ink-soft">
        <Link href="/shop" className="hover:text-pop">Shop</Link>
        <span>/</span>
        <Link href={`/shop/${slugFromCategory(product.category)}`} className="hover:text-pop">
          {product.category}
        </Link>
        <span>/</span>
        <span className="text-ink">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="relative aspect-square overflow-hidden rounded-3xl">
            <ProductImage images={product.images} alt={product.name} className="absolute inset-0" />
          </div>
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {product.images.slice(1, 5).map((img) => (
                <div key={img.id} className="relative aspect-square overflow-hidden rounded-xl">
                  <ProductImage images={[img]} alt={product.name} className="absolute inset-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-pop-dark">
            {product.category}
          </span>
          <h1 className="font-display text-3xl leading-tight sm:text-4xl">{product.name}</h1>
          <p className="text-2xl font-medium text-ink">
            {product.priceCents > 0 ? formatPrice(product.priceCents) : "Price upon request"}
          </p>

          <p className="leading-relaxed text-ink-soft">{product.description}</p>

          {details.length > 0 && (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 border-y border-line py-4 text-sm">
              {details.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-ink-soft">{label}</dt>
                  <dd className="font-medium text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="flex items-center gap-3">
            <AddToBagButton product={product} className="flex-1" />
            <LikeButton productId={product.id} initialCount={product.likeCount} />
          </div>

          {product.priceCents === 0 && (
            <Link
              href={`/contact?item=${encodeURIComponent(product.name)}`}
              className="text-center text-sm font-medium text-forest underline underline-offset-4"
            >
              Ask about pricing &amp; local pickup
            </Link>
          )}

          <SizeReference dimensions={product.dimensions} />

          <NotifySimilar category={product.category} />
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-6 font-display text-2xl">More from {product.category}</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export async function generateStaticParams() {
  const products = await getAllProducts();
  return products.map((p) => ({ slug: p.slug }));
}
