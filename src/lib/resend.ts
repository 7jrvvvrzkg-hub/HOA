import { Resend } from "resend";

let resendSingleton: Resend | null = null;

// Server-only Resend client, used for both cart-abandonment reminders and
// owner-triggered newsletter sends. See src/lib/email-templates for the
// actual HTML those two flows generate.
export function getResend(): Resend {
  if (!resendSingleton) {
    resendSingleton = new Resend(process.env.RESEND_API_KEY ?? "re_placeholder");
  }
  return resendSingleton;
}

export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "Embellish Antiques <hello@embellishantiques.com>";
