import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default function OrderConfirmedPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-forest" />
      <h1 className="font-display text-3xl">Thank you!</h1>
      <p className="mt-3 text-ink-soft">
        Your order is confirmed — a receipt is on its way to your inbox. We&apos;ll follow up with
        shipping details shortly.
      </p>
      <Link href="/shop" className="mt-6 inline-block rounded-full bg-pop px-6 py-3 text-sm font-semibold text-cream">
        Keep browsing
      </Link>
    </div>
  );
}
