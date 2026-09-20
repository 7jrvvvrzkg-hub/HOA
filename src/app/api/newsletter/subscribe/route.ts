import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createServiceClient } from "@/lib/supabase/server";
import { demoAddSubscriber } from "@/lib/data/demo-store";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const { email, interestCategory } = (await request.json()) as {
    email: string;
    interestCategory?: string;
  };

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, message: "That doesn't look like a valid email." }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    // Demo mode: keep the email in the in-memory demo store (so the admin
    // analytics "Newsletter subscribers" count reflects real signups during
    // this preview session) — actually emailing them still needs Resend +
    // Supabase, since sending real email requires a real provider.
    demoAddSubscriber(email);
    return NextResponse.json({ ok: true, persisted: false });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("subscribers")
    .upsert(
      { email: email.toLowerCase().trim(), interest_category: interestCategory ?? null, unsubscribed: false },
      { onConflict: "email" }
    );

  if (error) {
    return NextResponse.json({ ok: false, message: "Something went wrong — try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, persisted: true });
}
