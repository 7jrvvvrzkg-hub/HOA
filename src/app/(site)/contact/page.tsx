"use client";

import { useState } from "react";
import { Mail, MapPin, Phone } from "lucide-react";

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // No inbox is wired up yet — wire this to Resend (a simple "send us a
    // message" email to the owner) once a real RESEND_API_KEY exists. For
    // now it just confirms the form works.
    setSent(true);
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 lg:px-8">
      <div>
        <h1 className="font-display text-4xl italic">Get in touch</h1>
        <p className="mt-4 text-ink-soft">
          Questions about a piece, local pickup, or a custom sourcing request — we&apos;d love
          to hear from you.
        </p>
        <div className="mt-8 space-y-4 text-sm">
          <p className="flex items-center gap-3"><Mail className="h-4 w-4 text-pop" /> hello@embellishantiques.com</p>
          <p className="flex items-center gap-3"><Phone className="h-4 w-4 text-pop" /> (919) 971-8743</p>
          <p className="flex items-center gap-3"><MapPin className="h-4 w-4 text-pop" /> Durham, NC — by appointment</p>
        </div>
      </div>

      <div className="rounded-3xl border border-line bg-cloud p-6">
        {sent ? (
          <p className="text-forest">Thanks — we&apos;ll get back to you shortly.</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input required placeholder="Name" className="rounded-xl border border-line px-4 py-2.5 text-sm outline-none focus:border-pop" />
            <input required type="email" placeholder="Email" className="rounded-xl border border-line px-4 py-2.5 text-sm outline-none focus:border-pop" />
            <textarea required placeholder="Message" rows={5} className="rounded-xl border border-line px-4 py-2.5 text-sm outline-none focus:border-pop" />
            <button type="submit" className="rounded-full bg-pop py-3 text-sm font-semibold text-cream shadow-pop">
              Send message
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
