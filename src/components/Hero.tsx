import { ButtonLink } from "@/components/Button";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-primary text-cream">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-20 sm:px-6 sm:py-28">
        <span className="rounded-full bg-cream/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
          place holder (community name / est. year)
        </span>
        <h1 className="max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
          place holder (hero headline — welcome message for the community)
        </h1>
        <p className="max-w-xl text-base text-cream/85 sm:text-lg">
          place holder (hero subheading — one or two sentences about the community, e.g. amenities, location, character)
        </p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/login" variant="accent">
            place holder (primary CTA — e.g. resident login)
          </ButtonLink>
          <ButtonLink href="#contact" variant="outline" className="border-cream text-cream hover:bg-cream hover:text-primary">
            place holder (secondary CTA — e.g. contact us)
          </ButtonLink>
        </div>
      </div>
      {/* image placeholder — intentionally left blank, add real photography later */}
      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="flex h-48 w-full items-center justify-center rounded-lg border-2 border-dashed border-cream/30 text-sm text-cream/60 sm:h-72">
          place holder (hero image)
        </div>
      </div>
    </section>
  );
}
