"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { encryptExistingData, adminResetTwoStep } from "@/actions/security";

export function EncryptNowButton({ pending: pendingCount }: { pending: number }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, start] = useTransition();
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <Button
        type="button"
        size="sm"
        disabled={busy}
        onClick={() =>
          start(async () => {
            setMsg(null);
            const r = await encryptExistingData();
            if (!r.ok) setMsg(r.error ?? "something went wrong");
            else {
              const left = r.status ? r.status.documents.pending + r.status.forms.pending + r.status.submissions.pending : 0;
              setMsg(left === 0 ? "Everything is encrypted." : `${left} left — press again.`);
            }
            router.refresh();
          })
        }
      >
        {busy ? "Encrypting..." : pendingCount > 0 ? "Encrypt what's stored now" : "Check again"}
      </Button>
      {msg && <span className="text-sm text-ink-soft" role="status">{msg}</span>}
    </div>
  );
}

export function ResetTwoStepButton({ userId, email }: { userId: string; email: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, start] = useTransition();
  if (!confirming) {
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => setConfirming(true)}>
        Reset
      </Button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-xs">
      <span className="text-ink-soft">Remove two-step login for {email}?</span>
      <Button
        type="button"
        size="sm"
        variant="danger"
        disabled={busy}
        onClick={() =>
          start(async () => {
            const r = await adminResetTwoStep(userId);
            if (!r.ok) setMsg(r.error);
            else {
              setConfirming(false);
              router.refresh();
            }
          })
        }
      >
        {busy ? "..." : "Yes, reset"}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
      {msg && <span className="text-danger">{msg}</span>}
    </span>
  );
}
