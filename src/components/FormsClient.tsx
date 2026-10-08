"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { ClipboardList, X, Undo2, CheckCircle2 } from "lucide-react";
import { submitForm, undoFormSubmission } from "@/actions/forms";
import { Button } from "@/components/Button";
import { fitDocxToWidth } from "@/lib/docxFit";
import { activateBlanks, collectAnswers, hasAnyAnswer, type FormField } from "@/lib/formBlanks";

type FormItem = { id: string; title: string; description: string | null };
type Sent = { submissionId: string; title: string };

/** Fills a form: opens the Word file in the same blurred-background viewer
 * documents use, turns its blanks into inputs, and puts Submit at the very
 * bottom. Closing the viewer only hides it, so what was typed isn't lost. */
function FormFiller({
  form,
  visible,
  onHide,
  onSubmitted,
}: {
  form: FormItem;
  visible: boolean;
  onHide: () => void;
  onSubmitted: (s: Sent) => void;
}) {
  const holderRef = useRef<HTMLDivElement>(null);
  const fieldsRef = useRef<FormField[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;
    let cancelled = false;
    let stopFit: (() => void) | null = null;
    const target = document.createElement("div");
    holder.appendChild(target);
    (async () => {
      try {
        const [{ renderAsync }, res] = await Promise.all([
          import("docx-preview"),
          fetch(`/portal/forms/${form.id}/file`),
        ]);
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.arrayBuffer();
        await renderAsync(data, target, undefined, {
          className: "docx-preview",
          inWrapper: true,
          ignoreWidth: false,
          breakPages: true,
        });
        if (cancelled) return;
        fieldsRef.current = activateBlanks(target, () => setError(null));
        stopFit = fitDocxToWidth(target, holder.closest<HTMLElement>("[data-form-scroll]"));
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      stopFit?.();
      target.remove();
    };
  }, [form.id]);

  useEffect(() => {
    if (!visible) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onHide();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [visible, onHide]);

  function submit() {
    setError(null);
    const fields = fieldsRef.current;
    if (fields.length === 0) {
      setError("this form has no lines to fill in");
      return;
    }
    if (!hasAnyAnswer(fields)) {
      setError("fill in at least one line before submitting");
      return;
    }
    startTransition(async () => {
      try {
        const result = await submitForm(form.id, collectAnswers(fields));
        if (result.ok) onSubmitted({ submissionId: result.submissionId, title: form.title });
        else setError(result.error);
      } catch {
        setError("couldn't submit — please try again");
      }
    });
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={form.title}
      hidden={!visible}
      className={
        "fixed inset-0 z-[100] flex-col items-center bg-black/70 px-3 pb-4 pt-16 backdrop-blur-md sm:px-6 " +
        (visible ? "flex" : "hidden")
      }
      onClick={onHide}
    >
      <button
        type="button"
        onClick={onHide}
        aria-label="close form"
        className="fixed right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
      >
        <X size={20} />
      </button>

      <div
        data-form-scroll
        className="min-h-0 w-full max-w-4xl flex-1 overflow-y-auto overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {status === "loading" && <p className="py-10 text-center text-sm text-cream/80">Loading…</p>}
        {status === "error" && <p className="py-10 text-center text-sm text-cream/80">Couldn&apos;t load this form.</p>}
        <div ref={holderRef} className="docx-holder overflow-x-auto" />

        {status === "ready" && (
          <div className="mx-auto my-6 flex max-w-[816px] flex-col items-center gap-3 rounded-lg bg-white p-5 shadow-lg">
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="button" onClick={submit} disabled={pending}>
              {pending ? "Submitting..." : "Submit"}
            </Button>
          </div>
        )}
      </div>

      <p className="mt-3 max-w-full truncate px-2 text-sm text-cream/80" onClick={(e) => e.stopPropagation()}>
        {form.title}
      </p>
    </div>,
    document.body
  );
}

/** The resident-facing forms list. Submitted forms get an Undo button that
 * lives only in this component's memory — it disappears when the page is
 * reloaded or the resident leaves the Forms section, by design. */
export default function FormsClient({ forms }: { forms: FormItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [started, setStarted] = useState<Record<string, number>>({}); // formId -> key, so a fresh copy mounts after submit
  const [sent, setSent] = useState<Sent[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [undoing, setUndoing] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const hide = useCallback(() => setOpenId(null), []);

  function open(id: string) {
    setNotice(null);
    setStarted((s) => (id in s ? s : { ...s, [id]: 0 }));
    setOpenId(id);
  }

  function handleSubmitted(formId: string, s: Sent) {
    setSent((prev) => [s, ...prev]);
    setNotice(null);
    setOpenId(null);
    // Remount the filler so the next time it's opened it's blank again.
    setStarted((st) => ({ ...st, [formId]: (st[formId] ?? 0) + 1 }));
  }

  function undo(s: Sent) {
    setUndoing(s.submissionId);
    startTransition(async () => {
      const result = await undoFormSubmission(s.submissionId);
      setUndoing(null);
      if (result.ok) {
        setSent((prev) => prev.filter((x) => x.submissionId !== s.submissionId));
        setNotice(`"${s.title}" was undone.`);
      } else {
        setNotice(result.error ?? "couldn't undo that");
      }
    });
  }

  return (
    <div>
      {sent.map((s) => (
        <div
          key={s.submissionId}
          className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm"
        >
          <span className="flex items-center gap-2 text-ink">
            <CheckCircle2 size={18} className="text-primary" /> &quot;{s.title}&quot; was submitted.
          </span>
          <Button type="button" size="sm" variant="outline" onClick={() => undo(s)} disabled={undoing === s.submissionId}>
            <Undo2 size={14} /> {undoing === s.submissionId ? "Undoing..." : "Undo"}
          </Button>
        </div>
      ))}
      {notice && <p className="mb-3 rounded-md border border-cream-dark bg-white p-3 text-sm text-ink-soft">{notice}</p>}

      {forms.length === 0 ? (
        <p className="rounded-md border border-dashed border-cream-dark p-6 text-ink-soft">No forms have been added yet.</p>
      ) : (
        <ul className="divide-y divide-cream-dark rounded-lg border border-cream-dark bg-white">
          {forms.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3">
                <ClipboardList className="text-primary" size={24} />
                <div>
                  <p className="font-medium text-ink">{f.title}</p>
                  {f.description && <p className="text-sm text-ink-soft">{f.description}</p>}
                </div>
              </div>
              <Button type="button" size="sm" onClick={() => open(f.id)}>
                Fill Out
              </Button>
            </li>
          ))}
        </ul>
      )}

      {forms
        .filter((f) => f.id in started)
        .map((f) => (
          <FormFiller
            key={`${f.id}-${started[f.id]}`}
            form={f}
            visible={openId === f.id}
            onHide={hide}
            onSubmitted={(s) => handleSubmitted(f.id, s)}
          />
        ))}
    </div>
  );
}
