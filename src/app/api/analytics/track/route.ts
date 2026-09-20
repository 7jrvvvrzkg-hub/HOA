import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createServiceClient } from "@/lib/supabase/server";
import { demoTrackEvent } from "@/lib/data/demo-store";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    eventType: "category_view" | "product_click" | "product_view";
    category?: string;
    productId?: string;
  };

  if (!isSupabaseConfigured()) {
    // Demo mode: no Postgres to log to, so events feed the in-memory demo
    // store instead — the admin analytics page reads from the same place,
    // so "most-viewed categories" and per-item clicks/likes fill in for
    // real during this preview session.
    demoTrackEvent(body.eventType, { category: body.category, productId: body.productId });
    return NextResponse.json({ ok: true, persisted: false });
  }

  const supabase = createServiceClient();
  await supabase.from("analytics_events").insert({
    event_type: body.eventType,
    category: body.category ?? null,
    product_id: body.productId ?? null,
  });

  if (body.eventType === "product_click" && body.productId) {
    await supabase.rpc("increment_click_count", { p_product_id: body.productId }).select();
  }

  return NextResponse.json({ ok: true, persisted: true });
}
