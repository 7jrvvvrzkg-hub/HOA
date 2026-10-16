"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { endAllSessions, endSession } from "@/actions/sessions";

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  function run(fn: () => Promise<{ ok: true; message: string } | { ok: false; error: string }>) {
    setMsg(null);
    start(async () => {
      try {
        const r = await fn();
        setMsg(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error });
        if (r.ok) router.refresh();
      } catch {
        setMsg({ ok: false, text: "couldn't do that — please try again" });
      }
    });
  }
  return { pending, msg, run };
}

/** Sign one device out. Two clicks, so a stray tap can't do it. */
export function EndSessionButton({ sessionId }: { sessionId: string }) {
  const { pending, msg, run } = useRun();
  const [sure, setSure] = useState(false);
  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      {!sure ? (
        <Button type="button" size="sm" variant="outline" onClick={() => setSure(true)}>
          Sign out this device
        </Button>
      ) : (
        <span className="inline-flex flex-wrap items-center gap-2 text-xs">
          <Button type="button" size="sm" variant="danger" disabled={pending} onClick={() => run(() => endSession(sessionId))}>
            {pending ? "..." : "Yes, sign it out"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setSure(false)}>Cancel</Button>
        </span>
      )}
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "text-xs text-primary" : "text-xs text-danger"}>
          {msg.text}
        </p>
      )}
    </div>
  );
}

export function EndAllButton({ userId, count, isSelf }: { userId: string; count: number; isSelf: boolean }) {
  const { pending, msg, run } = useRun();
  const [sure, setSure] = useState(false);
  if (count === 0) return null;
  return (
    <div className="flex flex-col items-start gap-1">
      {!sure ? (
        <Button type="button" size="sm" variant="danger" onClick={() => setSure(true)}>
          {isSelf ? "Sign out all my other devices" : "Sign out everywhere"}
        </Button>
      ) : (
        <span className="inline-flex flex-wrap items-center gap-2 text-sm">
          <span className="text-danger">{isSelf ? "End every other sign-in?" : "End every sign-in for this account?"}</span>
          <Button type="button" size="sm" variant="danger" disabled={pending} onClick={() => run(() => endAllSessions(userId))}>
            {pending ? "..." : "Yes"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setSure(false)}>Cancel</Button>
        </span>
      )}
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "text-xs text-primary" : "text-xs text-danger"}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
