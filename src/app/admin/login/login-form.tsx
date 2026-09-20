"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";

export function LoginForm({ showEmailField }: { showEmailField: boolean }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => loginAction(formData),
    {}
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {showEmailField && (
        <input
          name="email"
          type="email"
          required
          placeholder="Owner email"
          className="rounded-xl border border-line bg-cloud px-4 py-2.5 text-sm outline-none focus:border-pop"
        />
      )}
      <input
        name="password"
        type="password"
        required
        placeholder={showEmailField ? "Password" : "Owner password"}
        className="rounded-xl border border-line bg-cloud px-4 py-2.5 text-sm outline-none focus:border-pop"
      />
      {state?.error && <p className="text-sm text-pop-dark">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-forest py-3 text-sm font-semibold text-cream disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
