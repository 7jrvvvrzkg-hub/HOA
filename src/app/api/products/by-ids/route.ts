import { NextResponse } from "next/server";
import { getAllProducts } from "@/lib/data/products";

// Backs the customer-facing "My Likes" page: liked product ids live in the
// visitor's own browser (localStorage, src/lib/liked-ids.ts) — there's no
// server-side "who liked what" table without a real database — so the page
// asks this route to resolve those ids into full product cards.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (!ids.length) return NextResponse.json({ products: [] });

  const all = await getAllProducts();
  const idSet = new Set(ids);
  const products = all.filter((p) => idSet.has(p.id));
  return NextResponse.json({ products });
}
