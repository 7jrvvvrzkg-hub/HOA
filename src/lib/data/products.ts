import "server-only";

import type { Category, Product } from "@/lib/types";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createServiceClient } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/categories";
import { demoListAll } from "@/lib/data/demo-store";

export { CATEGORIES };

// ── Mock/demo data source ───────────────────────────────────────────────
// Used whenever Supabase isn't configured yet, so the whole site is
// click-through-able (shop, product pages, cart, admin) with real ported
// catalog data before a single real credential exists — reads from the
// in-memory demo store (src/lib/data/demo-store.ts) so admin edits/uploads
// actually show up here instead of the static ported list never changing.
async function fromMock(): Promise<Product[]> {
  return demoListAll();
}

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_cents: number;
  category: Category;
  era: string | null;
  materials: string | null;
  dimensions: string | null;
  condition: string | null;
  status: Product["status"];
  is_new_arrival: boolean;
  like_count: number;
  view_count: number;
  click_count: number;
  created_at: string;
  sold_at: string | null;
  product_images: { id: string; url: string; position: number }[];
};

function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    category: row.category,
    era: row.era ?? undefined,
    materials: row.materials ?? undefined,
    dimensions: row.dimensions ?? undefined,
    condition: row.condition ?? undefined,
    status: row.status,
    isNewArrival: row.is_new_arrival,
    likeCount: row.like_count,
    viewCount: row.view_count,
    clickCount: row.click_count,
    createdAt: row.created_at,
    soldAt: row.sold_at ?? undefined,
    images: [...row.product_images]
      .sort((a, b) => a.position - b.position)
      .map((img) => ({ id: img.id, productId: row.id, url: img.url, position: img.position })),
  };
}

async function fromSupabase(): Promise<Product[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, product_images(*)")
    .order("created_at", { ascending: false });

  if (error || !data) return fromMock();
  return (data as ProductRow[]).map(rowToProduct);
}

async function getAll(): Promise<Product[]> {
  return isSupabaseConfigured() ? fromSupabase() : fromMock();
}

export async function getAllProducts(): Promise<Product[]> {
  const all = await getAll();
  return all.filter((p) => p.status !== "draft");
}

// Unlike getAllProducts(), this includes drafts — the admin item list and
// edit pages need to see (and be able to re-publish) drafts, unlike the
// customer-facing shop.
export async function getAllProductsForAdmin(): Promise<Product[]> {
  return getAll();
}

export async function getProductsByCategory(category: Category): Promise<Product[]> {
  const all = await getAllProducts();
  return all.filter((p) => p.category === category);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const all = await getAll();
  return all.find((p) => p.slug === slug);
}

export async function getNewArrivals(): Promise<Product[]> {
  const all = await getAllProducts();
  return all.filter((p) => p.isNewArrival);
}

export async function getSoldArchive(): Promise<Product[]> {
  const all = await getAll();
  return all.filter((p) => p.status === "sold");
}

export async function getMostLiked(limit = 6): Promise<Product[]> {
  const all = await getAllProducts();
  return [...all].sort((a, b) => b.likeCount - a.likeCount).slice(0, limit);
}

export async function searchProductNames(limit = 40): Promise<string[]> {
  const all = await getAllProducts();
  return all.slice(0, limit).map((p) => p.name);
}
