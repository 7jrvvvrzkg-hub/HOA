"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/Button";

function safeNext(from: string | null): string {
  // Only ever go to a page on this site.
  // Control characters (a tab or newline is silently dropped by browsers,
  // turning "/<tab>/evil.com" into "//evil.com"), backslashes and anything
  // that doesn't resolve to this same site are refused.
  if (!from || !from.startsWith("/") || from.startsWith("//") || /[\u0000-\u001f\u007f\\]/.test(from)) return "/portal";
  try {
    const u = new URL(from, window.location.origin);
    if (u.origin !== window.location.origin) return "/portal";
    return u.pathname + u.search + u.hash;
  } catch {
    return "/portal";
  }
}

function LoginForm() {
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("from"));
  const justChanged = searchParams.get("changed") === "1";
  const [step, setStep] = useState<"password" | "code">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        code: step === "code" ? code : "",
        redirect: false,
      });
      if (res?.ok && !res.error) {
        // The response has set the session cookie; a full page load picks it up.
        window.location.assign(next);
        return;
      }
      const lockedMatch = /^LOCKED:?(\d*)$/.exec(res?.error ?? "");
      if (lockedMatch) {
        const mins = Number(lockedMatch[1]) || 30;
        const wait = mins >= 60 ? `about ${Math.round(mins / 60)} hour${mins >= 90 ? "s" : ""}` : mins <= 1 ? "about a minute" : `about ${mins} minutes`;
        setError(`Too many attempts. You can try again in ${wait} — or use "Forgot your password?" below.`);
        setPending(false);
        return;
      }
      switch (res?.error) {
        case "MFA_REQUIRED":
          setStep("code");
          break;
        case "MFA_INVALID":
          setCode("");
          setError("That code didn't work. Try the newest code from your app, or use a backup code.");
          break;
        default:
          setError("Incorrect email or password.");
          setStep("password");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
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
          {step === "code"
            ? "Open your authenticator app and enter the 6-digit code."
            : "Sign in to access documents, the directory, and your profile."}
        </p>
        {justChanged && step === "password" && (
          <p className="mt-3 rounded-md bg-cream px-3 py-2 text-sm text-primary" role="status">
            Password saved. Please sign in with the new one.
          </p>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {step === "password" ? (
            <>
              <div>
                <label className="block text-sm font-medium text-ink" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-md border border-cream-dark px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-ink" htmlFor="code">
                Code
              </label>
              <input
                id="code"
                name="code"
                required
                autoFocus
                autoComplete="one-time-code"
                inputMode="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="font-plain mt-1 w-full rounded-md border border-cream-dark px-3 py-2 text-base tracking-widest focus:border-primary focus:outline-none"
              />
              <p className="mt-1 text-xs text-ink-soft">Lost your phone? Type one of your backup codes instead.</p>
            </div>
          )}

          {error && <p className="text-sm text-danger" role="alert">{error}</p>}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in..." : step === "code" ? "Verify" : "Sign In"}
          </Button>
          {step === "code" && (
            <button type="button" onClick={() => { setStep("password"); setCode(""); setError(null); }} className="text-sm text-primary hover:underline">
              ← Start over
            </button>
          )}
        </form>

        <p className="mt-6 text-sm">
          <Link href="/forgot-password" className="text-primary hover:underline">Forgot your password?</Link>
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
