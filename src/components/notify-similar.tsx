"use client";

import { useState } from "react";
import { BellRing } from "lucide-react";
import type { Category } from "@/lib/types";

/**
 * Unique-to-this-shop idea: nothing here restocks, so a normal "notify when
 * back in stock" flow doesn't apply. This instead waitlists someone for
 * "similar pieces in this style/category" — a low-friction way to capture
 * interest that would otherwise just bounce off a sold or one-off listing.
 */
export function NotifySimilar({ category }: { category: Category }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, interestCategory: category }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <p className="flex items-center gap-2 rounded-2xl border border-line bg-cream-soft px-4 py-3 text-sm text-forest">
        <BellRing className="h-4 w-4" /> You&apos;ll hear about it when something similar arrives.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-2xl border border-line bg-cream-soft p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-ink">
        <BellRing className="h-4 w-4 text-pop" /> Nothing here restocks — want a nudge when
        another {category.toLowerCase()} piece like this comes in?
      </p>
      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="w-full rounded-full border border-line bg-cloud px-4 py-2 text-sm outline-none focus:border-pop"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="shrink-0 rounded-full bg-forest px-4 py-2 text-sm font-semibold text-cream transition hover:bg-forest-dark disabled:opacity-60"
        >
          Notify me
        </button>
      </div>
      {status === "error" && <p className="text-xs text-ink-soft">Something went wrong — try again shortly.</p>}
    </form>
  );
}
