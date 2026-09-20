// Core domain types shared across the site, admin panel, and data layer.
// These mirror the Supabase schema in supabase/migrations/0001_init.sql —
// keep the two in sync when either changes.

export type Category =
  | "Barware"
  | "Lighting"
  | "Decorative Accessories"
  | "Case Goods"
  | "Seating"
  | "Garden"
  | "Fireplace"
  | "Mirrors";

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  position: number; // 0 = first/primary image, chosen by the owner
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  category: Category;
  era?: string; // e.g. "Mid-century, c. 1960s"
  materials?: string;
  dimensions?: string; // e.g. `34"W x 22"D x 30"H`
  condition?: string;
  images: ProductImage[];
  status: "available" | "sold" | "draft";
  isNewArrival: boolean;
  likeCount: number;
  viewCount: number;
  clickCount: number;
  createdAt: string;
  soldAt?: string;
}

export interface CartLineItem {
  productId: string;
  slug: string;
  name: string;
  priceCents: number;
  image: string;
  quantity: number;
}

export interface Subscriber {
  id: string;
  email: string;
  subscribedAt: string;
  unsubscribed: boolean;
}

export interface AnalyticsSummary {
  topCategories: { category: string; views: number }[];
  topProducts: { productId: string; name: string; clicks: number; likes: number }[];
  totalLikes: number;
  totalViews: number;
  totalSubscribers: number;
}
