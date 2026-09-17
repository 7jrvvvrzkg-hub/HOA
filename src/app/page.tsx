import TopBar from "@/components/TopBar";

// Announcements come straight from the database and admins expect edits to
// show up immediately, so this page always renders per-request rather than
// being baked into a static page at build time.
export const dynamic = "force-dynamic";
import Hero from "@/components/Hero";
import BulletinBoard from "@/components/BulletinBoard";
import MissionSection from "@/components/MissionSection";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <>
      <TopBar />
      <main className="flex-1">
        <Hero />
        <BulletinBoard />
        <MissionSection />
        <section className="bg-cream-dark/40 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="mb-8 text-center text-2xl font-bold text-primary sm:text-3xl">
              place holder (contact form heading)
            </h2>
            <ContactForm />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
