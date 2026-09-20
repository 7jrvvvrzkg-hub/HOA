// Real listings ported from the live embellishantiques.com (Wix) storefront
// on 2026-09-19. Names, categories, and prices were pulled directly from the
// site. Two things were NOT recoverable this way and need to come from the
// owner before launch:
//
//   1. Photos — Wix lazy-loads product images through client-side JS, so a
//      static fetch of the page never sees the real <img> src. Re-scraping
//      them would also mean rehosting Wix's compressed, lower-res CDN
//      copies, which is a downgrade from what he already has in full res.
//      Best path: he re-uploads originals through the new admin panel once
//      Supabase storage is wired up — see the "Back end to upload items"
//      feature (src/app/admin/items).
//   2. Long-form descriptions — the site doesn't expose full body copy to a
//      static fetch either, only titles/prices. The placeholder descriptions
//      below are NOT his copy — swap them for the real listing text.
//
// Two categories (Seating, Garden) don't list prices on the live site at
// all (common for made-to-inquire antique pricing) — priceCents is 0 for
// those and the UI shows "Price upon request" instead of a dollar amount.
// Mirrors currently has zero live listings.

import type { Category, Product } from "@/lib/types";

interface RawListing {
  name: string;
  category: Category;
  priceCents: number; // 0 = "price upon request"
}

const RAW: RawListing[] = [
  // Barware
  { name: "Chrome Art Deco Cocktail Shaker With Red Bakelite Handle", category: "Barware", priceCents: 27500 },
  { name: "Art Deco Pink Glass Ice Bucket With Ice Strainer", category: "Barware", priceCents: 29500 },
  { name: "Art Deco Pink Glass Ice Bucket", category: "Barware", priceCents: 29500 },
  { name: "Art Deco Cobalt Blue Cocktail Shaker With Silver Overlay Bands and Fluted Base", category: "Barware", priceCents: 25000 },
  { name: "Set of 6 Old Fashioned Rocks Frosted Cocktail Glasses With Red and Gold Band", category: "Barware", priceCents: 35000 },
  { name: "Mid-Century Glass Ice Bucket With Cocktail Recipes in Metal Carrier", category: "Barware", priceCents: 19500 },
  { name: "Mid-Century Bulls-Eye Glass Ice Bucket", category: "Barware", priceCents: 29500 },
  { name: "Mid Century Yellow and Black Vinyl Wrapped Ice Bucket", category: "Barware", priceCents: 27500 },
  { name: "Mid Century Ice Bucket with Faux Horn Handles", category: "Barware", priceCents: 27500 },
  { name: "Mexican Abalone and Alpaca Silver Ice Bucket and Tongs", category: "Barware", priceCents: 49500 },
  { name: "Large English Glass and Silver Plate Ice or Champagne Bucket", category: "Barware", priceCents: 59500 },
  { name: "Large Art Deco Chrome Cocktail Shaker", category: "Barware", priceCents: 37500 },

  // Lighting
  { name: "Monumental Electrified French Bronze Lanterns, Hanging or Wall-Mount", category: "Lighting", priceCents: 650000 },
  { name: "Pair of Marbro Floral Decorated Lamps", category: "Lighting", priceCents: 280000 },
  { name: "Pair of Chinese Porcelain Lamps", category: "Lighting", priceCents: 95000 },
  { name: "Pair of Paul Hanson Baccarat Style Urn Lamps", category: "Lighting", priceCents: 290000 },
  { name: "19th C Crystal Candlesticks With Etched Glass Hurricanes", category: "Lighting", priceCents: 199500 },
  { name: "Pair of French Painted Wrought Iron Wall Sconces", category: "Lighting", priceCents: 220000 },
  { name: "Pair of Vintage Painted Carved Wood Urn Shaped Lamps", category: "Lighting", priceCents: 185000 },
  { name: "Pair of Mid-Century Black Glazed Ceramic Lamps", category: "Lighting", priceCents: 129500 },
  { name: "Pair of Chinese Pagoda Form Ceramic Lamps", category: "Lighting", priceCents: 240000 },
  { name: "1930's Chase Chrome Art Deco Desk Lamps - a Pair", category: "Lighting", priceCents: 195000 },
  { name: "Late 19th Century Baccarat Opaline Lamps - a Pair", category: "Lighting", priceCents: 280000 },

  // Decorative Accessories
  { name: "Large French White Opaline Glass Vase", category: "Decorative Accessories", priceCents: 95000 },
  { name: "Recumbent Bronze Black Panther on Marble Base", category: "Decorative Accessories", priceCents: 95000 },
  { name: "19th Century English Mahogany Oversized Canterbury", category: "Decorative Accessories", priceCents: 189500 },
  { name: "Antique Indonesian Four Panel Screen", category: "Decorative Accessories", priceCents: 280000 },
  { name: "Pair of 19th C French Silvered Bronze Putti Candelabra", category: "Decorative Accessories", priceCents: 189500 },
  { name: "1900s Chinese Ceramic Roosters", category: "Decorative Accessories", priceCents: 290000 },
  { name: "Antique French Faience Vase", category: "Decorative Accessories", priceCents: 129500 },
  { name: "Pair of 19th C Cobalt Blue Meissen Serpent Porcelain Vases", category: "Decorative Accessories", priceCents: 240000 },

  // Case Goods
  { name: "Vintage French Rattan Bar Cart", category: "Case Goods", priceCents: 240000 },
  { name: "Vintage Red Chinoiserie Bachelors Chest", category: "Case Goods", priceCents: 290000 },
  { name: "George III Scottish Mahogany Sideboard Buffet Server", category: "Case Goods", priceCents: 890000 },
  { name: "Mid Century Black Lacquer Chest", category: "Case Goods", priceCents: 245000 },
  { name: "Vintage Maitland Smith Rush and Leather Clad Chest", category: "Case Goods", priceCents: 350000 },
  { name: "19th C. French Empire Style Ormolu Mounted Semainier Tall Chest", category: "Case Goods", priceCents: 790000 },

  // Seating (no listed prices on the live site — price upon request)
  { name: "Vintage Mid Century Atomic Chairs - a Pair", category: "Seating", priceCents: 0 },
  { name: "Vintage X Form Iron Bench", category: "Seating", priceCents: 0 },
  { name: "Pair of Black Wrought Iron Garden Chairs", category: "Seating", priceCents: 0 },
  { name: "Pair of Iron Horseshoe Back and Leather Chairs", category: "Seating", priceCents: 0 },
  { name: "Pair of Vintage Bamboo Chairs With Vinyl Seats", category: "Seating", priceCents: 0 },
  { name: "Vintage Aluminum Outdoor Patio Chairs - a Pair", category: "Seating", priceCents: 0 },
  { name: "Vintage Louis XV Settee", category: "Seating", priceCents: 0 },
  { name: "Pair of Antique Chinese Elm Black Lacquered Chairs", category: "Seating", priceCents: 0 },

  // Garden (no listed prices on the live site — price upon request)
  { name: "Early 20th Century English Water Barrow", category: "Garden", priceCents: 0 },
  { name: "Vintage Tile and Iron Tables", category: "Garden", priceCents: 0 },
  { name: "Vintage 6 Piece Rattan Set", category: "Garden", priceCents: 0 },

  // Fireplace
  { name: "Dolphin Brass Fireplace Tool Set With Marble Base", category: "Fireplace", priceCents: 129500 },
  { name: "Vintage Brass Lemon Top Andirons - a Pair", category: "Fireplace", priceCents: 95000 },
  { name: "Antique Pair of Cast Iron Dog Andirons", category: "Fireplace", priceCents: 280000 },

  // Mirrors — no live listings currently; category kept so nav/filter still works.
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function placeholderDescription(name: string, category: Category): string {
  return `${name} — a hand-selected piece from Embellish Antiques' ${category.toLowerCase()} collection. Full condition notes, provenance, and dimensions coming soon; replace this placeholder with the owner's original listing copy.`;
}

export const portedProducts: Product[] = RAW.map((item, index) => {
  const slug = slugify(item.name);
  return {
    id: `ported-${index + 1}`,
    slug,
    name: item.name,
    description: placeholderDescription(item.name, item.category),
    priceCents: item.priceCents,
    category: item.category,
    images: [],
    status: "available",
    isNewArrival: false,
    likeCount: 0,
    viewCount: 0,
    clickCount: 0,
    createdAt: new Date("2026-09-01").toISOString(),
  };
});
