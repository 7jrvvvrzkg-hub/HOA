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
          <h1 className="text-3xl font-bold sm:text-4xl">404</h1>
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
