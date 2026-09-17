"use client";

import { useActionState } from "react";
import { submitContactForm, type ContactFormState } from "@/actions/contact";
import { Button } from "@/components/Button";

const initialState: ContactFormState = { ok: false };

export default function ContactForm() {
  const [state, formAction, pending] = useActionState(submitContactForm, initialState);

  if (state.ok) {
    return (
      <div id="contact" className="mx-auto max-w-2xl rounded-lg border border-primary/20 bg-white/70 p-8 text-center">
        <h3 className="text-xl font-semibold text-primary">Thank you!</h3>
        <p className="mt-2 text-ink-soft">
          We received your message and will get back to you soon.
        </p>
      </div>
    );
  }

  return (
    <form id="contact" action={formAction} className="mx-auto max-w-2xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-ink" htmlFor="name">
            Full Name
          </label>
          <input
            id="name"
            name="name"
            required
            className="mt-1 w-full rounded-md border border-cream-dark bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-md border border-cream-dark bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-ink" htmlFor="phone">
          Phone (optional)
        </label>
        <input
          id="phone"
          name="phone"
          className="mt-1 w-full rounded-md border border-cream-dark bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-ink" htmlFor="message">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          className="mt-1 w-full rounded-md border border-cream-dark bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Sending..." : "Send Message"}
      </Button>
    </form>
  );
}
