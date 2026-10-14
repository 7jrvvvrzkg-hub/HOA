import Image from "next/image";

const hecht = { src: "/images/history-hecht.jpg", w: 1400, h: 1292, alt: "Historic black-and-white photo of the building when it was a wholesale warehouse" };

export default function HistorySection() {
  return (
    <section id="history" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h2 className="text-2xl font-bold text-primary sm:text-3xl">A Building With a Past</h2>
      <p className="mt-3 max-w-2xl text-ink-soft">
        Before it was our home, this was a working warehouse district building. The arched entrance and the brick
        have been here the whole time.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <figure className="overflow-hidden rounded-lg border border-cream-dark bg-white/60 md:col-span-2">
          <Image src={hecht.src} alt={hecht.alt} width={hecht.w} height={hecht.h}
            sizes="(min-width: 768px) 66vw, 100vw" className="h-72 w-full object-cover sm:h-96" />
          <figcaption className="px-4 py-2 text-sm text-ink-soft">The building in its warehouse days.</figcaption>
        </figure>
        <div className="grid gap-4">
          <figure className="overflow-hidden rounded-lg border border-cream-dark bg-white/60">
            <Image src="/images/history-shoes.jpg" alt="Historic photo of the original arched entrance" width={900} height={1184}
              sizes="(min-width: 768px) 33vw, 100vw" className="h-48 w-full object-cover object-top" />
            <figcaption className="px-4 py-2 text-sm text-ink-soft">The original entrance.</figcaption>
          </figure>
          <figure className="overflow-hidden rounded-lg border border-cream-dark bg-white/60">
            <Image src="/images/history-gas.jpg" alt="Historic photo of the building with a gas station out front" width={1400} height={1151}
              sizes="(min-width: 768px) 33vw, 100vw" className="h-48 w-full object-cover" />
            <figcaption className="px-4 py-2 text-sm text-ink-soft">The street in the early days.</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
