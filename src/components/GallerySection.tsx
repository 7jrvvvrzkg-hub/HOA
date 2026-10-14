import Image from "next/image";

const photos = [
  { src: "/images/atrium-wide.jpg", w: 1600, h: 1261, alt: "The timber-framed atrium with skylights", span: "sm:col-span-2 sm:row-span-2" },
  { src: "/images/entrance.jpg", w: 960, h: 682, alt: "The arched main entrance", span: "" },
  { src: "/images/sunset.jpg", w: 1024, h: 682, alt: "Tazewell Place at dusk", span: "" },
  { src: "/images/atrium-stairs.jpg", w: 1400, h: 937, alt: "Heavy timber and steel stairwell", span: "" },
  { src: "/images/lobby-stairs.jpg", w: 1400, h: 1018, alt: "Lobby and main staircase", span: "" },
  { src: "/images/lobby-bikes.jpg", w: 1400, h: 831, alt: "First-floor hall with bike storage", span: "sm:col-span-2" },
  { src: "/images/corner.jpg", w: 960, h: 682, alt: "The building from the street corner", span: "sm:col-span-2" },
];

export default function GallerySection() {
  return (
    <section id="gallery" className="bg-cream-dark/40 py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="text-center text-2xl font-bold text-primary sm:text-3xl">Gallery</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-ink-soft">
          Brick, heavy timber, and a sunlit atrium in the heart of downtown Norfolk.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-4">
          {photos.map((p) => (
            <div key={p.src} className={`relative min-h-48 overflow-hidden rounded-lg ${p.span}`}>
              <Image
                src={p.src}
                alt={p.alt}
                width={p.w}
                height={p.h}
                sizes="(min-width: 640px) 50vw, 100vw"
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
