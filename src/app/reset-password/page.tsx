import Link from "next/link";
import type { Metadata } from "next";
import { resetLinkIsValid } from "@/actions/passwordReset";
import ResetPasswordForm from "@/components/ResetPasswordForm";

// The link carries a secret in its address, so don't let the browser pass it
// along to any other site as a "referrer".
export const metadata: Metadata = { referrer: "no-referrer", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const valid = await resetLinkIsValid(token);

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm rounded-lg border border-cream-dark bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-primary">Choose a New Password</h1>
        {valid ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div className="mt-4 text-sm text-ink-soft" data-reset-invalid>
            <p>This link has expired or was already used.</p>
            <Link href="/forgot-password" className="mt-3 inline-block text-primary hover:underline">Ask for a new one →</Link>
          </div>
        )}
      </div>
    </div>
  );
}
