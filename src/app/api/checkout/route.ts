import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { isStripeConfigured, isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createServiceClient } from "@/lib/supabase/server";
import type { CartLineItem } from "@/lib/types";

export async function POST(request: Request) {
  const { items } = (await request.json()) as { items: CartLineItem[] };

  if (!items?.length) {
    return NextResponse.json({ message: "Your bag is empty." }, { status: 400 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json({
      message:
        "Stripe isn't connected yet — add a real STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to go live. Checkout will redirect to real Stripe Checkout once those are set.",
    });
  }

  const stripe = getStripe();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: items.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: "usd",
        unit_amount: item.priceCents,
        product_data: {
          name: item.name,
          images: item.image ? [item.image] : undefined,
          metadata: { productId: item.productId },
        },
      },
    })),
    shipping_address_collection: { allowed_countries: ["US", "CA", "GB", "AU"] },
    success_url: `${siteUrl}/order-confirmed?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/cart`,
    // Shortish expiry so an abandoned checkout (see the
    // checkout.session.expired handler in api/stripe/webhook) triggers a
    // reminder email at a useful time rather than a day later. Stripe's
    // minimum is 30 minutes from creation.
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
  });

  if (isSupabaseConfigured()) {
    const supabase = createServiceClient();
    await supabase.from("orders").insert({
      stripe_session_id: session.id,
      status: "pending",
      total_cents: items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0),
    });
  }

  return NextResponse.json({ url: session.url });
}
