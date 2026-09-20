// The project ships with placeholder Supabase/Stripe/Resend credentials so it
// runs end-to-end (against in-memory mock data) before real keys exist. These
// helpers let the data/payment/email layers detect "still a placeholder" and
// fall back gracefully instead of crashing on a fake API call.

function looksLikePlaceholder(value: string | undefined, marker: string): boolean {
  if (!value) return true;
  return value.includes(marker) || value.includes("placeholder");
}

export const isSupabaseConfigured = (): boolean =>
  !looksLikePlaceholder(process.env.NEXT_PUBLIC_SUPABASE_URL, "embellish-antiques.supabase.co") &&
  !looksLikePlaceholder(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "placeholder");

export const isStripeConfigured = (): boolean =>
  !looksLikePlaceholder(process.env.STRIPE_SECRET_KEY, "Placeholder");

export const isResendConfigured = (): boolean =>
  !looksLikePlaceholder(process.env.RESEND_API_KEY, "Placeholder");
