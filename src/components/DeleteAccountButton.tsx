"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/Button";
import { deleteUserAccount } from "@/actions/users";
import { UNDO_EVENT } from "@/components/UndoToastHost";

/** Deleting an account asks first, in a pop-up that names the person, and
 * then offers a 10-second Undo (shown by UndoToastHost, which sticks around
 * even after this row disappears). */
export default function DeleteAccountButton({
  userId,
  name,
  label = "Delete",
  afterHref,
}: {
  userId: string;
  /** Who is being deleted, for the confirmation ("Alex Smith · alex@example.com"). */
  name: string;
  label?: string;
  afterHref?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // The safe choice is the one that's focused.
    cancelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, pending]);

  function confirm() {
    setError(null);
    start(async () => {
      try {
        const r = await deleteUserAccount(userId);
        if (!r.ok) {
          setError(r.error);
          return;
        }
        setOpen(false);
        window.dispatchEvent(new CustomEvent(UNDO_EVENT, { detail: { token: r.undoToken, label: r.label } }));
        if (afterHref) router.push(afterHref);
        else router.refresh();
      } catch {
        setError("Couldn't delete that account. Please try again.");
      }
    });
  }

  return (
    <>
      <Button type="button" size="sm" variant="danger" onClick={() => { setError(null); setOpen(true); }}>
        {label}
      </Button>
      {open &&
        createPortal(
          <div
            className="lightbox-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
            onClick={() => !pending && setOpen(false)}
          >
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-title"
              aria-describedby="delete-desc"
              onClick={(e) => e.stopPropagation()}
              className="lightbox-photo w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
                  <AlertTriangle size={20} />
                </span>
                <div className="min-w-0">
                  <h2 id="delete-title" className="text-lg font-semibold text-ink">Delete this account?</h2>
                  <p className="font-plain mt-1 break-words text-sm font-semibold text-ink">{name}</p>
                  <p id="delete-desc" className="font-plain mt-2 text-sm text-ink-soft">
                    This removes their login, profile, notes and any personal documents. You&apos;ll get 10 seconds to
                    undo it right after.
                  </p>
                </div>
              </div>
              {error && (
                <p role="alert" className="font-plain mt-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
                  {error}
                </p>
              )}
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  ref={cancelRef}
                  type="button"
                  disabled={pending}
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-cream-dark px-4 py-2 text-sm font-medium text-ink hover:bg-cream-dark/50 focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                >
                  Cancel
                </button>
                <Button type="button" variant="danger" disabled={pending} onClick={confirm}>
                  {pending ? "Deleting..." : "Yes, delete it"}
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
