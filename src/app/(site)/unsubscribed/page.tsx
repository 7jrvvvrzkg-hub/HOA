import Link from "next/link";

export default async function UnsubscribedPage({ searchParams }: PageProps<"/unsubscribed">) {
  const { status } = await searchParams;

  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="font-display text-3xl">
        {status === "invalid" ? "That link didn't check out" : "You're unsubscribed"}
      </h1>
      <p className="mt-3 text-ink-soft">
        {status === "invalid"
          ? "That unsubscribe link looks broken or expired — email us and we'll take care of it by hand."
          : "You won't get any more newsletter emails from Embellish Antiques. Sorry to see you go."}
      </p>
      <Link href="/" className="mt-6 inline-block rounded-full bg-pop px-6 py-3 text-sm font-semibold text-cream">
        Back to the shop
      </Link>
    </div>
  );
}
