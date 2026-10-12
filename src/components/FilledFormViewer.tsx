"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, X } from "lucide-react";
import { Button } from "@/components/Button";
import { activateBlanks } from "@/lib/formBlanks";
import { fitDocxToWidth } from "@/lib/docxFit";

type Answer = { label: string; value: string };

/** The board's view of a submission: the original form, in the same blurred
 * viewer residents fill it in, with their answers written into the lines. */
function Viewer({ formId, title, answers, onClose }: { formId: string; title: string; answers: Answer[]; onClose: () => void }) {
  const holderRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "mismatch" | "error">("loading");

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;
    let cancelled = false;
    let stopFit: (() => void) | null = null;
    const target = document.createElement("div");
    holder.appendChild(target);
    (async () => {
      try {
        const [{ renderAsync }, res] = await Promise.all([import("docx-preview"), fetch(`/portal/forms/${formId}/file`)]);
        if (!res.ok) throw new Error("fetch failed");
        await renderAsync(await res.arrayBuffer(), target, undefined, {
          className: "docx-preview",
          inWrapper: true,
          ignoreWidth: false,
          breakPages: true,
        });
        if (cancelled) return;
        const fields = activateBlanks(target);
        if (fields.length !== answers.length) {
          // The form no longer matches what was submitted; the answer list
          // under the submission is still correct, so just say so.
          setStatus("mismatch");
          return;
        }
        // Swap each input for plain text showing what was typed, so long
        // answers wrap instead of getting cut off.
        fields.forEach((f, i) => {
          const a = answers[i];
          const span = document.createElement("span");
          if (f.kind === "checkbox") {
            span.className = "form-answer-check";
            span.textContent = a.value === "Yes" ? "☑" : "☐";
          } else {
            span.className = "form-answer";
            span.textContent = a.value || " ";
          }
          f.el.replaceWith(span);
        });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- renders once per open
  }, [formId]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} (filled out)`}
      className="fixed inset-0 z-[100] flex flex-col items-center bg-black/70 px-3 pb-4 pt-16 backdrop-blur-md sm:px-6"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="close filled form"
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
        {status === "mismatch" && (
          <p className="py-10 text-center text-sm text-cream/80">
            The form was changed after this was submitted, so use the list of answers instead.
          </p>
        )}
        <div ref={holderRef} className={status === "mismatch" ? "hidden" : "docx-holder overflow-x-auto"} />
      </div>
      <p className="mt-3 max-w-full truncate px-2 text-sm text-cream/80" onClick={(e) => e.stopPropagation()}>
        {title}
      </p>
    </div>,
    document.body
  );
}

export default function FilledFormViewer({ formId, title, answers }: { formId: string | null; title: string; answers: Answer[] }) {
  const [open, setOpen] = useState(false);
  if (!formId) {
    return <p className="text-xs text-ink-soft">The original form was deleted, so only the answers are shown.</p>;
  }
  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Eye size={14} /> View Filled Form
      </Button>
      {open && <Viewer formId={formId} title={title} answers={answers} onClose={() => setOpen(false)} />}
    </>
  );
}
