"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/Button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/portal";
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const formData = new FormData(e.currentTarget);

    const res = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });

    setPending(false);
    if (res?.error) {
      setError("place holder (login error copy — incorrect email or password)");
      return;
    }
    router.push(from);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm rounded-lg border border-cream-dark bg-white p-8 shadow-sm">
        <Link href="/" className="text-sm text-primary hover:underline">
          place holder (back to homepage link)
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-primary">place holder (login heading)</h1>
        <p className="mt-1 text-sm text-ink-soft">
          place holder (login subheading — sign in to access documents, the directory, and your profile)
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="email">
              place holder (email label)
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
              place holder (password label)
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
            {pending ? "place holder (signing-in label)" : "place holder (sign-in button label)"}
          </Button>
        </form>

        <p className="mt-6 text-xs text-ink-soft">
          place holder (help copy — forgot your password? contact the office at (phone/email))
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
