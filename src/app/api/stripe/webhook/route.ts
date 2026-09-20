import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { isSupabaseConfigured, isResendConfigured } from "@/lib/supabase/is-configured";
import { createServiceClient } from "@/lib/supabase/server";
import { getResend, FROM_EMAIL } from "@/lib/resend";
import { abandonedCartEmail } from "@/lib/email-templates";
import { getAllProducts } from "@/lib/data/products";

// Stripe webhook — handles two events:
//  - checkout.session.completed: mark the order paid (and, if Supabase is
//    configured, record the line items).
//  - checkout.session.expired: this is how we detect an abandoned cart
//    with Stripe Checkout, since Stripe doesn't have a dedicated
//    "abandoned cart" event. Sessions are created with a fixed expiry (see
//    src/app/api/checkout/route.ts); if the shopper got far enough to type
//    their email before bailing, Stripe still hands it back on
//    `customer_details`, and we use that to send one reminder.
//
// Register this URL (https://yourdomain.com/api/stripe/webhook) in the
// Stripe dashboard for both events once real keys are in place.

export async function POST(request: Request) {
  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature ?? "", process.env.STRIPE_WEBHOOK_SECRET ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (isSupabaseConfigured()) {
      const supabase = createServiceClient();
      await supabase
        .from("orders")
        .update({
          status: "paid",
          customer_email: session.customer_details?.email ?? null,
          shipping_address: session.collected_information?.shipping_details?.address ?? null,
        })
        .eq("stripe_session_id", session.id);
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const email = session.customer_details?.email;

    if (email && isResendConfigured()) {
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 20 });
      const allProducts = await getAllProducts();

      const items = lineItems.data.map((li) => {
        const productId = (li.price?.product as Stripe.Product | undefined)?.metadata?.productId;
        const match = productId ? allProducts.find((p) => p.id === productId) : undefined;
        return {
          name: li.description ?? "Item",
          priceCents: li.amount_total ?? 0,
          image: match?.images[0]?.url,
          slug: match?.slug ?? "",
        };
      });

      const { subject, html } = abandonedCartEmail(email, items);
      await getResend().emails.send({ from: FROM_EMAIL, to: email, subject, html });
    }

    if (isSupabaseConfigured()) {
      const supabase = createServiceClient();
      await supabase.from("orders").update({ status: "cancelled" }).eq("stripe_session_id", session.id);
    }
  }

  return NextResponse.json({ received: true });
}
