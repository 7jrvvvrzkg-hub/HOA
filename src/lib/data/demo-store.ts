import "server-only";

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Category, Product, ProductImage } from "@/lib/types";
import { portedProducts } from "@/lib/data/ported-listings";
import { slugify } from "@/lib/format";

// ── Demo-mode data store ────────────────────────────────────────────────
// Used only when Supabase isn't configured, so the admin panel is a real,
// working preview instead of a read-only mock: adding/editing/deleting
// items, uploading photos, reordering them, and logging likes/analytics all
// actually happen here.
//
// This is backed by a JSON file on disk (under the OS temp directory),
// re-read and re-written on every call, rather than a plain in-memory
// module variable. That's deliberate: Next.js compiles page renders/Server
// Actions and standalone Route Handlers (the files under app/api/**) into
// separate bundles, and in testing a plain `let products = [...]` module
// variable ended up as a *separate copy per bundle* — an item created
// through the admin (a Server Action) was invisible to /api/products/by-ids
// (a Route Handler) even though both import this same file. Reading from a
// shared file on disk sidesteps that entirely, since disk I/O isn't
// per-bundle. It's still not a database:
//   - It persists across requests for as long as the server stays warm on
//     the same machine (the whole session during local `npm run dev`/`npm
//     start`, and for a while on a single warm Vercel serverless instance).
//   - It resets on a redeploy, a cold start, or whenever a request lands on
//     a different serverless instance than the one that made the change —
//     which on Vercel can happen at any time under real traffic, and each
//     instance has its own separate temp filesystem.
//   - Concurrent writes aren't locked — fine for a single person demoing
//     this, not a real concurrency story.
// Connect Supabase (see the README) for changes that actually stick.

interface StoreShape {
  products: Product[];
  nextProductId: number;
  nextImageId: number;
  categoryViews: Partial<Record<Category, number>>;
  subscribers: string[];
}

const STORE_PATH = path.join(os.tmpdir(), "embellish-antiques-demo-store.json");

function initialStore(): StoreShape {
  return {
    products: portedProducts.map((p) => ({ ...p, images: [] as ProductImage[] })),
    nextProductId: portedProducts.length + 1,
    nextImageId: 1,
    categoryViews: {},
    subscribers: [],
  };
}

function readStore(): StoreShape {
  try {
    const raw = fs.readFileSync(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as StoreShape;
    if (!Array.isArray(parsed.products)) return initialStore();
    return parsed;
  } catch {
    return initialStore();
  }
}

function writeStore(store: StoreShape): void {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(store));
  } catch {
    // Best-effort — if the temp dir isn't writable for some reason, the
    // demo store just won't persist across requests; nothing to crash over.
  }
}

export function demoListAll(): Product[] {
  return readStore().products;
}

export function demoGetById(id: string): Product | undefined {
  return readStore().products.find((p) => p.id === id);
}

export function demoInsert(input: {
  name: string;
  description: string;
  priceCents: number;
  category: Category;
  era?: string;
  materials?: string;
  dimensions?: string;
  condition?: string;
  isNewArrival: boolean;
}): Product {
  const store = readStore();
  const product: Product = {
    id: `demo-${store.nextProductId}`,
    slug: `${slugify(input.name)}-${Date.now().toString(36)}`,
    name: input.name,
    description: input.description,
    priceCents: input.priceCents,
    category: input.category,
    era: input.era || undefined,
    materials: input.materials || undefined,
    dimensions: input.dimensions || undefined,
    condition: input.condition || undefined,
    images: [],
    status: "available",
    isNewArrival: input.isNewArrival,
    likeCount: 0,
    viewCount: 0,
    clickCount: 0,
    createdAt: new Date().toISOString(),
  };
  store.nextProductId += 1;
  store.products = [product, ...store.products];
  writeStore(store);
  return product;
}

export function demoUpdate(
  id: string,
  patch: Partial<
    Pick<
      Product,
      "name" | "description" | "priceCents" | "category" | "era" | "materials" | "dimensions" | "condition" | "isNewArrival"
    >
  >
): boolean {
  const store = readStore();
  const idx = store.products.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  store.products[idx] = { ...store.products[idx], ...patch };
  writeStore(store);
  return true;
}

export function demoSetStatus(id: string, status: Product["status"]): boolean {
  const store = readStore();
  const idx = store.products.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  store.products[idx] = {
    ...store.products[idx],
    status,
    soldAt: status === "sold" ? new Date().toISOString() : undefined,
  };
  writeStore(store);
  return true;
}

export function demoDelete(id: string): boolean {
  const store = readStore();
  const before = store.products.length;
  store.products = store.products.filter((p) => p.id !== id);
  writeStore(store);
  return store.products.length < before;
}

export function demoAddImage(productId: string, url: string): ProductImage | undefined {
  const store = readStore();
  const idx = store.products.findIndex((p) => p.id === productId);
  if (idx === -1) return undefined;
  const image: ProductImage = {
    id: `demo-img-${store.nextImageId}`,
    productId,
    url,
    position: store.products[idx].images.length,
  };
  store.nextImageId += 1;
  store.products[idx] = { ...store.products[idx], images: [...store.products[idx].images, image] };
  writeStore(store);
  return image;
}

export function demoDeleteImage(imageId: string): boolean {
  const store = readStore();
  for (let i = 0; i < store.products.length; i++) {
    const before = store.products[i].images.length;
    const images = store.products[i].images.filter((img) => img.id !== imageId).map((img, pos) => ({ ...img, position: pos }));
    if (images.length < before) {
      store.products[i] = { ...store.products[i], images };
      writeStore(store);
      return true;
    }
  }
  return false;
}

export function demoReorderImages(productId: string, orderedIds: string[]): boolean {
  const store = readStore();
  const idx = store.products.findIndex((p) => p.id === productId);
  if (idx === -1) return false;
  const byId = new Map(store.products[idx].images.map((img) => [img.id, img]));
  const reordered = orderedIds
    .map((id, position) => {
      const img = byId.get(id);
      return img ? { ...img, position } : undefined;
    })
    .filter((v): v is ProductImage => Boolean(v));
  store.products[idx] = { ...store.products[idx], images: reordered };
  writeStore(store);
  return true;
}

export function demoSetLiked(productId: string, liked: boolean): void {
  const store = readStore();
  const idx = store.products.findIndex((p) => p.id === productId);
  if (idx === -1) return;
  store.products[idx] = {
    ...store.products[idx],
    likeCount: Math.max(0, store.products[idx].likeCount + (liked ? 1 : -1)),
  };
  writeStore(store);
}

export function demoTrackEvent(
  eventType: "category_view" | "product_click" | "product_view",
  opts: { category?: string; productId?: string }
): void {
  const store = readStore();
  let changed = false;
  if (eventType === "category_view" && opts.category) {
    const cat = opts.category as Category;
    store.categoryViews[cat] = (store.categoryViews[cat] ?? 0) + 1;
    changed = true;
  }
  if (opts.productId) {
    const idx = store.products.findIndex((p) => p.id === opts.productId);
    if (idx !== -1) {
      if (eventType === "product_click") store.products[idx] = { ...store.products[idx], clickCount: store.products[idx].clickCount + 1 };
      if (eventType === "product_view") store.products[idx] = { ...store.products[idx], viewCount: store.products[idx].viewCount + 1 };
      changed = true;
    }
  }
  if (changed) writeStore(store);
}

export function demoTopCategories(limit = 8): { category: string; views: number }[] {
  const store = readStore();
  return Object.entries(store.categoryViews)
    .map(([category, views]) => ({ category, views: views ?? 0 }))
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}

export function demoAddSubscriber(email: string): void {
  const store = readStore();
  const normalized = email.toLowerCase().trim();
  if (!store.subscribers.includes(normalized)) {
    store.subscribers.push(normalized);
    writeStore(store);
  }
}

export function demoSubscriberCount(): number {
  return readStore().subscribers.length;
}
