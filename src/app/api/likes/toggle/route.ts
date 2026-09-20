import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createServiceClient } from "@/lib/supabase/server";
import { demoSetLiked } from "@/lib/data/demo-store";

export async function POST(request: Request) {
  const { productId, visitorId, liked } = (await request.json()) as {
    productId: string;
    visitorId: string;
    liked: boolean;
  };

  if (!productId || !visitorId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // In demo mode (no Supabase yet), which visitor liked what still lives in
  // that visitor's own browser via localStorage (src/lib/liked-ids.ts) —
  // there's no per-visitor table without a real database. But the
  // like *count* shown on each card is shared UI, so it's kept in the
  // in-memory demo store here, the same one the admin analytics page reads
  // from. Once Supabase is configured, the trigger in 0001_init.sql keeps
  // products.like_count in sync automatically whenever a row is
  // inserted/deleted in the real `likes` table instead.
  if (!isSupabaseConfigured()) {
    demoSetLiked(productId, liked);
    return NextResponse.json({ ok: true, persisted: false });
  }

  const supabase = createServiceClient();

  if (liked) {
    await supabase.from("likes").upsert(
      { product_id: productId, visitor_id: visitorId },
      { onConflict: "product_id,visitor_id" }
    );
  } else {
    await supabase.from("likes").delete().match({ product_id: productId, visitor_id: visitorId });
  }

  return NextResponse.json({ ok: true, persisted: true });
}
