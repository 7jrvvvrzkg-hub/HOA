"use client";

import { useState, useTransition } from "react";
import { setUserPassword } from "@/actions/users";
import { Button } from "@/components/Button";

/** Set a new password for an account. Shown only to someone allowed to (an
 * admin, or the director who just created the account); the server checks
 * that again on its own. */
export default function SetPasswordForm({ userId }: { userId: string }) {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      try {
        await setUserPassword(userId, password);
        setPassword("");
        setMessage({ ok: true, text: "Password changed." });
      } catch (err) {
        setMessage({ ok: false, text: err instanceof Error ? err.message : "couldn't change the password" });
      }
    });
  }

  return (
    <form onSubmit={submit} className="mt-3 flex flex-wrap items-center gap-2">
      <label className="text-sm text-ink-soft" htmlFor={`pw-${userId}`}>New Password</label>
      <input
        id={`pw-${userId}`}
        type="text"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        minLength={8}
        required
        autoComplete="off"
        className="rounded-md border border-cream-dark px-2 py-1 text-sm"
      />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Saving..." : "Change"}
      </Button>
      {message && <span className={message.ok ? "text-xs text-primary" : "text-xs text-danger"}>{message.text}</span>}
    </form>
  );
}
