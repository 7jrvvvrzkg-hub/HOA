import type { Category } from "@/lib/types";

export const CATEGORY_LIST: { slug: string; label: Category }[] = [
  { slug: "barware", label: "Barware" },
  { slug: "lighting", label: "Lighting" },
  { slug: "decorative-accessories", label: "Decorative Accessories" },
  { slug: "case-goods", label: "Case Goods" },
  { slug: "seating", label: "Seating" },
  { slug: "garden", label: "Garden" },
  { slug: "fireplace", label: "Fireplace" },
  { slug: "mirrors", label: "Mirrors" },
];

export function categoryFromSlug(slug: string): Category | undefined {
  return CATEGORY_LIST.find((c) => c.slug === slug)?.label;
}

export function slugFromCategory(category: Category): string {
  return CATEGORY_LIST.find((c) => c.label === category)?.slug ?? category.toLowerCase();
}

// Plain client-safe list of category labels — kept here (not in
// lib/data/products.ts, which is server-only) so client components like
// the admin item form can import it without pulling in server-only code.
export const CATEGORIES: Category[] = CATEGORY_LIST.map((c) => c.label);
