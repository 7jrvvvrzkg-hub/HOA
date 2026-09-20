import TopBar from "@/components/TopBar";
import Footer from "@/components/Footer";
import BlockPartyGame from "@/components/BlockPartyGame";
import { ButtonLink } from "@/components/Button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <main className="flex flex-1 flex-col items-center gap-6 bg-primary px-4 py-12 text-center text-cream">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">404</p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">This page doesn&apos;t live here.</h1>
          <p className="mt-2 text-cream/80">
            While you figure out where you meant to go, here&apos;s a little block-stacking game
            we put together — Block Party.
          </p>
        </div>

        <BlockPartyGame />

        <ButtonLink href="/" variant="accent" size="md" className="mt-2">
          <Home size={18} /> Back to the homepage
        </ButtonLink>
      </main>
      <Footer />
    </div>
  );
}
