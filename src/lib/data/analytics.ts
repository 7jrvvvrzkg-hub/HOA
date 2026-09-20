import "server-only";

import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createServiceClient } from "@/lib/supabase/server";
import { getAllProducts } from "@/lib/data/products";
import { demoTopCategories, demoSubscriberCount } from "@/lib/data/demo-store";
import type { AnalyticsSummary } from "@/lib/types";

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const products = await getAllProducts();

  const topProducts = [...products]
    .filter((p) => p.clickCount + p.likeCount > 0)
    .sort((a, b) => b.clickCount + b.likeCount - (a.clickCount + a.likeCount))
    .slice(0, 8)
    .map((p) => ({ productId: p.id, name: p.name, clicks: p.clickCount, likes: p.likeCount }));

  const totalLikes = products.reduce((sum, p) => sum + p.likeCount, 0);
  const totalViews = products.reduce((sum, p) => sum + p.viewCount, 0);

  let topCategories: AnalyticsSummary["topCategories"] = [];
  let totalSubscribers = 0;

  if (!isSupabaseConfigured()) {
    // Demo mode: pull from the same in-memory store that
    // /api/analytics/track and /api/newsletter/subscribe write to, so this
    // page reflects real browsing during the current preview session
    // instead of sitting empty until Supabase is connected.
    topCategories = demoTopCategories(8);
    totalSubscribers = demoSubscriberCount();
  }

  if (isSupabaseConfigured()) {
    const supabase = createServiceClient();

    const { data: events } = await supabase
      .from("analytics_events")
      .select("category")
      .eq("event_type", "category_view")
      .not("category", "is", null);

    const counts = new Map<string, number>();
    for (const row of events ?? []) {
      const cat = (row as { category: string }).category;
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    topCategories = [...counts.entries()]
      .map(([category, views]) => ({ category, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 8);

    const { count } = await supabase
      .from("subscribers")
      .select("id", { count: "exact", head: true })
      .eq("unsubscribed", false);
    totalSubscribers = count ?? 0;
  }

  return { topCategories, topProducts, totalLikes, totalViews, totalSubscribers };
}
