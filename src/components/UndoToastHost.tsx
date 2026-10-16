"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";
import { undoDeleteAccount } from "@/actions/users";

export const UNDO_EVENT = "hoa:undo-delete";
export const UNDO_SHOW_SECONDS = 10;

type Toast = { token: string; label: string; expiresAt: number };

/** Lives in the admin console's layout (so it survives the page changing under
 * it). After an account is deleted it shows "Undo" for 10 seconds. */
export default function UndoToastHost() {
  const router = useRouter();
  const [toast, setToast] = useState<Toast | null>(null);
  const [left, setLeft] = useState(UNDO_SHOW_SECONDS);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onEvent = (e: Event) => {
      const d = (e as CustomEvent<{ token: string; label: string }>).detail;
      if (!d?.token) return;
      setNote(null);
      setToast({ token: d.token, label: d.label, expiresAt: Date.now() + UNDO_SHOW_SECONDS * 1000 });
      setLeft(UNDO_SHOW_SECONDS);
    };
    window.addEventListener(UNDO_EVENT, onEvent);
    return () => window.removeEventListener(UNDO_EVENT, onEvent);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setInterval(() => {
      const secs = Math.ceil((toast.expiresAt - Date.now()) / 1000);
      if (secs <= 0) {
        setToast(null);
      } else {
        setLeft(secs);
      }
    }, 250);
    return () => clearInterval(t);
  }, [toast]);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 6000);
    return () => clearTimeout(t);
  }, [note]);

  const undo = useCallback(async () => {
    if (!toast || busy) return;
    setBusy(true);
    try {
      const r = await undoDeleteAccount(toast.token);
      setNote(r.ok ? { ok: true, text: `Restored ${toast.label}.` } : { ok: false, text: r.error });
      if (r.ok) router.refresh();
    } catch {
      setNote({ ok: false, text: "Couldn't undo that. Nothing was changed." });
    }
    setToast(null);
    setBusy(false);
  }, [toast, busy, router]);

  if (!toast && !note) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[110] flex justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto relative w-full max-w-md overflow-hidden rounded-lg bg-ink px-4 py-3 text-cream shadow-2xl"
      >
        {toast ? (
          <>
            <div className="font-plain flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 break-words">
                Deleted <strong className="font-semibold">{toast.label}</strong>
              </span>
              <button
                type="button"
                onClick={undo}
                disabled={busy}
                className="font-plain flex shrink-0 items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-ink hover:bg-accent-dark disabled:opacity-60"
              >
                <Undo2 size={15} /> {busy ? "Restoring..." : `Undo (${left})`}
              </button>
            </div>
            <div
              className="undo-bar absolute bottom-0 left-0 h-1 bg-accent"
              style={{ animationDuration: `${UNDO_SHOW_SECONDS}s` }}
              aria-hidden
            />
          </>
        ) : (
          note && (
            <p className={`font-plain text-sm ${note.ok ? "text-cream" : "text-[#ffb4ae]"}`}>{note.text}</p>
          )
        )}
      </div>
    </div>
  );
}
