import { Mail, Phone, MapPin } from "lucide-react";

export default function MissionSection() {
  return (
    <section id="mission" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="grid gap-10 md:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold text-primary sm:text-3xl">
            place holder (mission statement heading)
          </h2>
          <p className="mt-4 text-ink-soft">
            place holder (mission statement body — a paragraph describing the association&apos;s
            purpose, values, and what it does for residents)
          </p>
          <p className="mt-4 text-ink-soft">
            place holder (secondary paragraph — history of the community / what makes it
            unique)
          </p>
        </div>

        <div className="rounded-lg border border-cream-dark bg-white/60 p-6">
          <h3 className="text-lg font-semibold text-primary">place holder (contact details heading)</h3>
          <ul className="mt-4 space-y-3 text-sm text-ink-soft">
            <li className="flex items-center gap-3">
              <MapPin size={18} className="text-accent" />
              place holder (mailing / office address)
            </li>
            <li className="flex items-center gap-3">
              <Phone size={18} className="text-accent" />
              place holder (phone number)
            </li>
            <li className="flex items-center gap-3">
              <Mail size={18} className="text-accent" />
              place holder (general contact email)
            </li>
          </ul>
          <div className="mt-6 border-t border-cream-dark pt-4 text-sm text-ink-soft">
            <p className="font-medium text-ink">place holder (office hours heading)</p>
            <p>place holder (office hours, e.g. mon–fri 9am–5pm)</p>
          </div>
        </div>
      </div>
    </section>
  );
}
