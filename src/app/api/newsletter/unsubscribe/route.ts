import { NextResponse } from "next/server";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe-token";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const email = verifyUnsubscribeToken(token);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? url.origin;

  if (!email) {
    return NextResponse.redirect(`${siteUrl}/unsubscribed?status=invalid`);
  }

  if (isSupabaseConfigured()) {
    const supabase = createServiceClient();
    await supabase
      .from("subscribers")
      .update({ unsubscribed: true, unsubscribed_at: new Date().toISOString() })
      .eq("email", email);
  }

  return NextResponse.redirect(`${siteUrl}/unsubscribed?status=ok`);
}
