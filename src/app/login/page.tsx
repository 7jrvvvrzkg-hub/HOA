"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/Button";

function LoginForm() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/portal";
  const [pending, setPending] = useState(false);
  // A failed sign-in redirects back here with "?error=CredentialsSignin" —
  // see the comment on signIn() below for why this reads from the URL
  // instead of a response value. Read straight off the URL during render
  // rather than mirrored into state, so there's no extra render pass.
  const error = searchParams.get("error") ? "Incorrect email or password." : null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const formData = new FormData(e.currentTarget);

    // A real (non-JS) redirect rather than redirect:false + router.push().
    // With redirect:false, the sign-in cookie is set by the credentials
    // callback response, but the *next* request (the router.push to
    // /portal, and especially a fast click straight through to another
    // portal page right after) could go out before the browser has
    // actually persisted that cookie — a real, if narrow, race, and
    // exactly what clicking through quickly was tripping. Letting NextAuth
    // do the redirect itself means the cookie is set and used within the
    // same browser-managed navigation, so there's nothing left to race.
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: true,
      callbackUrl: from,
    });
    // Only reached if signIn itself throws before redirecting (network
    // error, etc.) — a failed login redirects back here with ?error= instead.
    setPending(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm rounded-lg border border-cream-dark bg-white p-8 shadow-sm">
        <Link href="/" className="text-sm text-primary hover:underline">
          ← Back to homepage
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-primary">Sign In</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Sign in to access documents, the directory, and your profile.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-md border border-cream-dark px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="mt-1 w-full rounded-md border border-cream-dark px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <p className="mt-6 text-xs text-ink-soft">
          Forgot your password? Contact the office and an admin can reset it for you.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
