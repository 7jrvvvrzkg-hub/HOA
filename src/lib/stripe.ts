import Stripe from "stripe";

let stripeSingleton: Stripe | null = null;

// Server-only Stripe client. Never import this from a client component.
export function getStripe(): Stripe {
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder", {
      apiVersion: "2025-08-27.basil" as Stripe.LatestApiVersion,
    });
  }
  return stripeSingleton;
}
