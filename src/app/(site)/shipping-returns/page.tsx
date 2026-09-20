export const metadata = { title: "Shipping & Returns" };

export default function ShippingReturnsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl italic">Shipping &amp; Returns</h1>

      <div className="mt-8 space-y-8 text-ink-soft">
        <section>
          <h2 className="font-display text-xl text-ink">Shipping</h2>
          <p className="mt-2 leading-relaxed">
            Complimentary shipping is included within the US on most items. Larger furniture
            pieces ship via white-glove freight; smaller items ship via standard parcel carriers.
            International shipping is available — reach out for a quote before checkout on
            anything marked &ldquo;price upon request.&rdquo;
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl text-ink">Local pickup</h2>
          <p className="mt-2 leading-relaxed">
            Local pickup from our Durham, NC warehouse is available by appointment — mention it
            in your order notes or reach out directly.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl text-ink">Returns</h2>
          <p className="mt-2 leading-relaxed">
            Because every piece is one of a kind and antique/vintage in condition, all sales are
            final unless an item arrives materially different from its listing photos and
            description. Contact us within 48 hours of delivery if there&apos;s an issue.
          </p>
        </section>
        <p className="text-xs italic text-ink-soft/70">
          Placeholder policy text — replace with the owner&apos;s actual terms before launch.
        </p>
      </div>
    </div>
  );
}
