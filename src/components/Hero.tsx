import Image from "next/image";
import { ButtonLink } from "@/components/Button";

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
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-black/10" />
      {/* soft shade at the very top so the menu stays readable over the photo */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/50 to-transparent" />
      <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-8 px-4 pb-16 pt-32 sm:px-6 sm:pb-28 sm:pt-44">
        <div className="flex flex-col items-start gap-6">
          <span className="rounded-full bg-cream/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent backdrop-blur-sm">
            230 West Tazewell Street · Norfolk, VA
          </span>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
            Welcome to Tazewell Place
          </h1>
          <p className="max-w-xl text-base text-cream/90 sm:text-lg">
            place holder (short description of site)
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
      </div>
    </section>
  );
}
