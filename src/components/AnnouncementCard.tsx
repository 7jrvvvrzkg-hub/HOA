"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pin, X } from "lucide-react";
import clsx from "clsx";

export type AnnouncementView = {
  id: string;
  title: string;
  body: string;
  priority: "NORMAL" | "IMPORTANT" | "URGENT";
  priorityLabel: string;
  pinned: boolean;
  inactive?: boolean;
  dateText: string;
  imageUrl: string | null;
};

const priorityStyle: Record<string, { pin: string; ring: string; tag: string }> = {
  URGENT: { pin: "text-danger", ring: "ring-danger/40", tag: "bg-danger text-cream" },
  IMPORTANT: { pin: "text-warning", ring: "ring-warning/40", tag: "bg-warning text-ink" },
  NORMAL: { pin: "text-primary", ring: "ring-primary/20", tag: "bg-primary text-cream" },
};

// A bulletin-board sticky (homepage) or a list card (portal). Long text is cut
// off with "…" and a "Read full announcement" cue; clicking anywhere on the
// card opens the whole thing in a blurred pop-up laid out like an article.
export default function AnnouncementCard({
  a,
  variant,
  tilt = "",
}: {
  a: AnnouncementView;
  variant: "sticky" | "list";
  tilt?: string;
}) {
  const [open, setOpen] = useState(false);
  const [clamped, setClamped] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const openerRef = useRef<HTMLDivElement>(null);
  const style = priorityStyle[a.priority] ?? priorityStyle.NORMAL;

  // Is any of the text actually cut off? Only then do we show the cue.
  useLayoutEffect(() => {
    const t = titleRef.current;
    const b = bodyRef.current;
    if (!t || !b) return;
    const check = () => setClamped(b.scrollHeight - b.clientHeight > 1 || t.scrollHeight - t.clientHeight > 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(b);
    ro.observe(t);
    return () => ro.disconnect();
  }, [a.body, a.title]);

  useEffect(() => {
    if (!open) return;
    const opener = openerRef.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      opener?.focus();
    };
  }, [open]);

  const content = (
    <div className="flex min-w-0 gap-3">
      <div className="min-w-0 flex-1">
        <div className={clsx("flex flex-wrap items-center gap-2", variant === "list" && "mb-1")}>
          {variant === "list" && a.pinned && <Pin size={14} className="text-accent" />}
          <h3 ref={titleRef} className="line-clamp-2 min-w-0 max-w-full [overflow-wrap:anywhere] font-semibold text-ink">{a.title}</h3>
          {variant === "list" && (
            <>
              <span className={clsx("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", style.tag)}>{a.priorityLabel}</span>
              {a.inactive && (
                <span className="rounded-full bg-ink-soft/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-ink-soft">inactive</span>
              )}
            </>
          )}
        </div>
        <p
          ref={bodyRef}
          className={clsx("max-w-full whitespace-pre-line [overflow-wrap:anywhere] text-sm text-ink-soft", variant === "sticky" ? "mt-2 line-clamp-4" : "mt-1 line-clamp-3")}
        >
          {a.body}
        </p>
      </div>
      {a.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- served from our own DB-backed route, not an optimizable static asset
        <img
          src={a.imageUrl}
          alt=""
          loading="lazy"
          className="aspect-[4/5] w-[34%] max-w-[9rem] shrink-0 self-start rounded-xl border border-black/5 object-cover shadow-sm"
        />
      )}
    </div>
  );

  const footer = (
    <div className="mt-3 flex items-center justify-between gap-3">
      <p className="text-xs text-ink-soft/70">{a.dateText}</p>
      {clamped && <span className="text-xs font-semibold text-primary">Read full announcement →</span>}
    </div>
  );

  const openIt = () => setOpen(true);

  return (
    <>
      <div
        ref={openerRef}
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-label={`Open announcement: ${a.title}`}
        onClick={openIt}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openIt();
          }
        }}
        className={clsx(
          "block min-w-0 max-w-full cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          variant === "sticky"
            ? clsx("pin-card relative rounded-sm bg-[#fdf6e3] p-5 shadow-lg ring-1 transition-transform hover:-translate-y-1 hover:rotate-0", tilt, style.ring)
            : "overflow-hidden rounded-lg border border-cream-dark bg-white p-5 transition-shadow hover:shadow-md"
        )}
      >
        {variant === "sticky" && (
          <>
            <Pin size={22} className={clsx("absolute -top-3 left-1/2 -translate-x-1/2 drop-shadow", style.pin)} fill="currentColor" />
            {a.pinned && (
              <span className={clsx("absolute -top-3 right-3 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", style.tag)}>pinned</span>
            )}
          </>
        )}
        <div className={clsx(variant === "sticky" && "mt-2")}>{content}</div>
        {footer}
      </div>

      {open &&
        createPortal(
          <div
            className="lightbox-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-3 backdrop-blur-md sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`ann-${a.id}`}
            onClick={() => setOpen(false)}
          >
            <article
              onClick={(e) => e.stopPropagation()}
              className="lightbox-photo relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-[#fdf6e3] shadow-2xl"
            >
              <button
                type="button"
                autoFocus
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/90 text-ink shadow hover:bg-white focus-visible:outline-2 focus-visible:outline-primary"
              >
                <X size={20} />
              </button>
              <div className="overflow-y-auto overscroll-contain">
                {a.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- served from our own DB-backed route
                  <img src={a.imageUrl} alt="" className="max-h-72 w-full object-cover sm:max-h-96" />
                )}
                <div className="p-6 sm:p-8">
                  <div className="flex flex-wrap items-center gap-2 pr-10">
                    <span className={clsx("rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase", style.tag)}>{a.priorityLabel}</span>
                    {a.pinned && <span className="inline-flex items-center gap-1 text-xs text-ink-soft"><Pin size={12} /> Pinned</span>}
                    <span className="text-xs text-ink-soft/80">{a.dateText}</span>
                  </div>
                  <h2 id={`ann-${a.id}`} className="mt-3 [overflow-wrap:anywhere] text-2xl font-bold leading-snug text-primary sm:text-3xl">{a.title}</h2>
                  <div className="my-4 h-px bg-black/10" />
                  <p className="whitespace-pre-line [overflow-wrap:anywhere] text-base leading-relaxed text-ink">{a.body}</p>
                </div>
              </div>
            </article>
          </div>,
          document.body
        )}
    </>
  );
}
