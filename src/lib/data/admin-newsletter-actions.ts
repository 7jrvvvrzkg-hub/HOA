"use server";

import { isResendConfigured, isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createServiceClient } from "@/lib/supabase/server";
import { getResend, FROM_EMAIL } from "@/lib/resend";
import { newsletterEmail } from "@/lib/email-templates";
import { getAllProducts } from "@/lib/data/products";

type Result = { ok: boolean; message: string; recipientCount?: number };

export async function sendNewsletter(formData: FormData): Promise<Result> {
  const subject = String(formData.get("subject") ?? "").trim();
  const intro = String(formData.get("intro") ?? "").trim();
  const productIds = formData.getAll("productIds").map(String);

  if (!subject) return { ok: false, message: "Give the newsletter a subject line." };
  if (!productIds.length) return { ok: false, message: "Pick at least one item to feature." };

  if (!isSupabaseConfigured() || !isResendConfigured()) {
    return {
      ok: false,
      message:
        "Connect Supabase (for the subscriber list) and Resend (to actually send) to go live — this composer works end-to-end once both are set.",
    };
  }

  const supabase = createServiceClient();
  const allProducts = await getAllProducts();
  const items = productIds
    .map((id) => allProducts.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => ({ name: p.name, priceCents: p.priceCents, image: p.images[0]?.url, slug: p.slug }));

  const { data: subscribers, error } = await supabase
    .from("subscribers")
    .select("email")
    .eq("unsubscribed", false);

  if (error) return { ok: false, message: error.message };
  if (!subscribers?.length) return { ok: false, message: "No subscribers yet — nothing to send." };

  const resend = getResend();
  const BATCH_SIZE = 50;
  let sent = 0;

  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE) as { email: string }[];
    await Promise.all(
      batch.map((s) =>
        resend.emails.send({
          from: FROM_EMAIL,
          to: s.email,
          subject,
          html: newsletterEmail(s.email, subject, intro, items),
        })
      )
    );
    sent += batch.length;
  }

  await supabase.from("newsletters").insert({
    subject,
    html: newsletterEmail("preview@embellishantiques.com", subject, intro, items),
    product_ids: productIds,
    sent_at: new Date().toISOString(),
    recipient_count: sent,
  });

  return { ok: true, message: `Sent to ${sent} subscriber${sent === 1 ? "" : "s"}.`, recipientCount: sent };
}
