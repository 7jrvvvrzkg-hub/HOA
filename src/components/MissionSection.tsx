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
            place holder (what the association does for residents and why it exists)
          </p>
          <p className="mt-4 text-ink-soft">
            place holder (a bit about the community&apos;s history and what makes it unique)
          </p>
        </div>

        <div className="rounded-lg border border-cream-dark bg-white/60 p-6">
          <h3 className="text-lg font-semibold text-primary">Contact Us</h3>
          <ul className="mt-4 space-y-3 text-sm text-ink-soft">
            <li className="flex items-center gap-3">
              <MapPin size={18} className="text-accent" />
              230 West Tazewell Street, Norfolk, VA
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
            <p className="font-medium text-ink">Office Hours</p>
            <p>place holder (office hours, for example monday–friday 9am–5pm)</p>
          </div>
        </div>
      </div>
    </section>
  );
}
