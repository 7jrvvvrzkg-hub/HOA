import Image from "next/image";
import { ButtonLink } from "@/components/Button";
import Logo from "@/components/Logo";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-primary-dark text-cream">
      <Image
        src="/images/hero-exterior.jpg"
        alt="Tazewell Place on its corner in downtown Norfolk"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-primary-dark/90 via-primary-dark/70 to-primary-dark/30" />
      <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-8 px-4 py-16 sm:px-6 sm:py-28 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col items-start gap-6">
          <span className="rounded-full bg-cream/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent backdrop-blur-sm">
            230 West Tazewell Street · Norfolk, VA
          </span>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
            Welcome to Tazewell Place
          </h1>
          <p className="max-w-xl text-base text-cream/90 sm:text-lg">
            News, documents, and forms for the residents and owners of our community, all in one place.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/login" variant="accent">
              Resident Login
            </ButtonLink>
            <ButtonLink href="#contact" variant="outlineInvert">
              Contact Us
            </ButtonLink>
          </div>
        </div>
        <div className="hidden rounded-lg bg-cream/95 p-6 shadow-xl md:block">
          <Logo height={220} animate />
        </div>
      </div>
    </section>
  );
}
