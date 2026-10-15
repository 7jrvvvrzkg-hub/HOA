"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, type ResetRequestState } from "@/actions/passwordReset";
import { Button } from "@/components/Button";

const initial: ResetRequestState = { done: false };

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initial);

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm rounded-lg border border-cream-dark bg-white p-8 shadow-sm">
        <Link href="/login" className="text-sm text-primary hover:underline">← Back to sign in</Link>
        <h1 className="mt-4 text-2xl font-bold text-primary">Forgot Password</h1>

        {state.done ? (
          <p className="mt-4 text-sm text-ink-soft" data-reset-sent>
            If there&apos;s an account with that email, we&apos;ve sent a link to choose a new password. It works for one hour.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-ink-soft">Enter your email and we&apos;ll send you a link.</p>
            <form action={formAction} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink" htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  maxLength={254}
                  className="mt-1 w-full rounded-md border border-cream-dark px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? "Sending..." : "Send Link"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
