"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPassword, type ResetState } from "@/actions/passwordReset";
import { Button } from "@/components/Button";

const initial: ResetState = { ok: false };

export default function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPassword.bind(null, token), initial);

  if (state.ok) {
    return (
      <div className="mt-4 text-sm text-ink-soft" data-reset-done>
        <p>Your password was changed.</p>
        <Link href="/login" className="mt-3 inline-block text-primary hover:underline">Sign in →</Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-ink" htmlFor="password">New Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={12}
          maxLength={72}
          autoComplete="new-password"
          className="mt-1 w-full rounded-md border border-cream-dark px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
        <p className="mt-1 text-xs text-ink-soft">At least 12 characters. A few random words strung together works well.</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-ink" htmlFor="confirm">Type It Again</label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          required
          minLength={12}
          maxLength={200}
          autoComplete="new-password"
          className="mt-1 w-full rounded-md border border-cream-dark px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving..." : "Change Password"}
      </Button>
    </form>
  );
}
