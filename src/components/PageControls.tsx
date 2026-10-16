"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";

/** « <  [ 3 ]  of 27  > » — arrows step one page; the box lets you type a page
 * number to jump a long way. `hrefFor(n)` builds the address for page n. The
 * address is built here from plain values (not passed as a function) because
 * this is a client component. */
export default function PageControls({
  page,
  totalPages,
  basePath,
  params,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  params: Record<string, string>;
}) {
  const router = useRouter();
  const [text, setText] = useState(String(page));
  useEffect(() => setText(String(page)), [page]);

  const hrefFor = (n: number) => {
    const q = new URLSearchParams(params);
    if (n > 1) q.set("page", String(n));
    else q.delete("page");
    const qs = q.toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  };

  function go(raw: string) {
    const n = Number.parseInt(raw.replace(/[^\d]/g, ""), 10);
    if (!Number.isFinite(n)) {
      setText(String(page));
      return;
    }
    const clamped = Math.min(Math.max(1, n), totalPages);
    setText(String(clamped));
    if (clamped !== page) router.push(hrefFor(clamped));
  }

  const arrow = "flex h-10 w-10 items-center justify-center rounded-md border border-cream-dark bg-white text-primary transition-colors";
  const on = "hover:border-primary hover:bg-primary hover:text-cream";
  const off = "pointer-events-none opacity-40";

  return (
    <nav aria-label="Pages" className="mt-5 flex items-center justify-center gap-2 sm:gap-3">
      <button
        type="button"
        aria-label="Newer page"
        disabled={page <= 1}
        onClick={() => router.push(hrefFor(page - 1))}
        className={clsx(arrow, page <= 1 ? off : on)}
      >
        <ChevronLeft size={20} />
      </button>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(text);
        }}
        className="font-plain flex items-center gap-2 text-sm text-ink-soft"
      >
        <label className="sr-only" htmlFor="page-number">Page number</label>
        <input
          id="page-number"
          inputMode="numeric"
          autoComplete="off"
          value={text}
          onChange={(e) => setText(e.target.value.replace(/[^\d]/g, "").slice(0, 7))}
          onBlur={() => go(text)}
          onFocus={(e) => e.currentTarget.select()}
          className="h-10 w-16 rounded-md border border-cream-dark bg-white text-center text-base text-ink focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        />
        <span className="whitespace-nowrap">of {totalPages.toLocaleString("en-US")}</span>
      </form>

      <button
        type="button"
        aria-label="Older page"
        disabled={page >= totalPages}
        onClick={() => router.push(hrefFor(page + 1))}
        className={clsx(arrow, page >= totalPages ? off : on)}
      >
        <ChevronRight size={20} />
      </button>
    </nav>
  );
}
