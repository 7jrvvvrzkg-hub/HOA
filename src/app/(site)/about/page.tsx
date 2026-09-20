import { MusicStaffDivider } from "@/components/music-staff-divider";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="mx-auto flex max-w-5xl gap-6 px-4 py-16 sm:px-6 lg:px-8">
      <MusicStaffDivider className="hidden sm:flex" />
      <div className="min-w-0 flex-1">
        <span className="text-xs font-semibold uppercase tracking-widest text-pop-dark">Our story</span>
        <h1 className="mt-2 font-display text-4xl italic">About Embellish Antiques</h1>

        <div className="mt-8 space-y-5 leading-relaxed text-ink-soft">
          <p>
            Embellish Antiques is a Durham, North Carolina-based dealer specializing in
            hand-selected antique and vintage pieces — from Art Deco barware and monumental
            French lighting to one-of-a-kind case goods and garden furniture. Every item is
            personally sourced and chosen for character, not just condition.
          </p>
          <p>
            We ship nationwide and worldwide from our Durham warehouse, and every piece that
            passes through our doors is one of a kind — once it&apos;s gone, it&apos;s gone.
            That&apos;s part of the appeal: you&apos;re not buying something mass-produced,
            you&apos;re giving an object with real history a second life.
          </p>
          <p>
            <em>
              (This page is a placeholder built to hold real business history, photos, and
              the owner&apos;s voice — swap this copy for his actual story once he sends it
              over.)
            </em>
          </p>
        </div>
      </div>
    </div>
  );
}
