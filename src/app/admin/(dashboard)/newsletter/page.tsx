import { NewsletterComposer } from "@/components/admin/newsletter-composer";
import { getAllProducts } from "@/lib/data/products";

export const metadata = { title: "Newsletter" };

export default async function AdminNewsletterPage() {
  const products = await getAllProducts();

  return (
    <div>
      <h1 className="mb-2 font-display text-3xl">Newsletter</h1>
      <p className="mb-6 max-w-xl text-sm text-ink-soft">
        Pick a few pieces, write a one-liner, and send. This goes out to everyone subscribed who
        hasn&apos;t unsubscribed — every email includes a working unsubscribe link automatically.
      </p>
      <NewsletterComposer products={products} />
    </div>
  );
}
