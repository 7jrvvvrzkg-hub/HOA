"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, LockOpen } from "lucide-react";
import { Button } from "@/components/Button";
import { unlockSensitiveActions } from "@/actions/security";

/** Sits at the top of the admin console. Sensitive actions (passwords, roles,
 * deleting accounts, creating admins) only work while it says "unlocked". */
export default function StepUpBar({ untilIso }: { untilIso: string | null }) {
  const router = useRouter();
  const [until, setUntil] = useState<number | null>(untilIso ? new Date(untilIso).getTime() : null);
  const [now, setNow] = useState(() => Date.now());
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  const open = until !== null && until > now;

  function unlock(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await unlockSensitiveActions(code);
      if (r.ok) {
        setUntil(new Date(r.until).getTime());
        setNow(Date.now());
        setCode("");
        router.refresh();
      } else setError(r.error);
    });
  }

  if (open) {
    const mins = Math.max(1, Math.ceil((until! - now) / 60000));
    return (
      <p className="mt-4 flex items-center gap-2 rounded-md bg-cream px-3 py-2 text-sm text-primary" data-stepup="open">
        <LockOpen size={16} /> Sensitive actions are unlocked for about {mins} more minute{mins === 1 ? "" : "s"}.
      </p>
    );
  }
  return (
    <form onSubmit={unlock} className="mt-4 flex flex-wrap items-center gap-2 rounded-md border border-cream-dark bg-white px-3 py-2 text-sm" data-stepup="locked">
      <Lock size={16} className="text-ink-soft" />
      <span className="text-ink-soft">Changing passwords, roles or accounts is locked. Enter your 6-digit code to unlock for 10 minutes:</span>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="6-digit code"
        maxLength={11}
        required
        className="font-plain w-28 rounded-md border border-cream-dark px-2 py-1 tracking-widest"
      />
      <Button type="submit" size="sm" disabled={pending}>{pending ? "..." : "Unlock"}</Button>
      {error && <span className="text-danger" role="alert">{error}</span>}
    </form>
  );
}
