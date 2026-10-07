"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FileText, FileSpreadsheet, Presentation, X, Eye } from "lucide-react";
import { previewKind, type PreviewKind } from "@/lib/fileTypes";

// A thumbnail that opens the document in a viewer on this same page
// (blurred backdrop, close button, scrolling) instead of a new tab. Every
// file is fetched from our own access-checked route and drawn in the
// browser, so nothing is sent to a third-party viewer service: images as-is,
// PDFs page by page onto canvases (pdf.js), Word with docx-preview, Excel
// as tables, PowerPoint as slides, and plain text / CSV directly. Older
// formats (.doc, .xls, .ppt, .pages) can't be drawn reliably in a browser,
// so those get a plain icon and the Download button.

type Props = {
  id: string;
  title: string;
  mimeType: string;
  fileName: string;
};

// ---- pdf.js (compatibility build, so older phones/browsers work too) ----

type PdfJs = typeof import("pdfjs-dist");

let pdfjsPromise: Promise<PdfJs> | null = null;
function loadPdfJs() {
  pdfjsPromise ??= import("pdfjs-dist/legacy/build/pdf.mjs").then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
    return pdfjs as unknown as PdfJs;
  });
  return pdfjsPromise;
}

async function fetchBytes(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("couldn't load file");
  return res.arrayBuffer();
}

async function loadPdf(url: string) {
  const [pdfjs, data] = await Promise.all([loadPdfJs(), fetchBytes(url)]);
  return pdfjs.getDocument({ data }).promise;
}

type PdfDoc = Awaited<ReturnType<typeof loadPdf>>;
type PdfPage = Awaited<ReturnType<PdfDoc["getPage"]>>;

async function drawPage(page: PdfPage, canvas: HTMLCanvasElement, cssWidth: number) {
  const base = page.getViewport({ scale: 1 });
  const scale = cssWidth / base.width;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const viewport = page.getViewport({ scale: scale * ratio });
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${Math.floor(viewport.height / ratio)}px`;
  await page.render({ canvas, viewport }).promise;
}

function PdfThumbnail({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    let cancelled = false;
    // Only fetch and draw once the thumbnail is actually near the screen.
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();
        (async () => {
          try {
            const pdf = await loadPdf(url);
            const page = await pdf.getPage(1);
            if (cancelled || !canvasRef.current) return;
            await drawPage(page, canvasRef.current, 64);
          } catch {
            if (!cancelled) setFailed(true);
          }
        })();
      },
      { rootMargin: "200px" }
    );
    observer.observe(box);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [url]);

  return (
    <div ref={boxRef} className="flex h-full w-full items-start justify-center overflow-hidden bg-white">
      {failed ? <FileText className="m-auto text-primary" size={24} /> : <canvas ref={canvasRef} />}
    </div>
  );
}

// ---- the content of the viewer, one renderer per kind ----

type Status = "loading" | "ready" | "error";

/** Runs `render` into a holder div once, tracking loading / error state. */
function useRenderInto(url: string, render: (holder: HTMLDivElement, isCancelled: () => boolean) => Promise<void>) {
  const holderRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;
    let cancelled = false;
    // Each run draws into its own child element, removed on cleanup, so a
    // render that finishes late (the viewer was closed or re-opened) lands
    // in a detached node instead of doubling up what's on screen.
    const target = document.createElement("div");
    holder.appendChild(target);
    (async () => {
      try {
        await render(target, () => cancelled);
        if (!cancelled) setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      target.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- render is defined inline per kind and only depends on url
  }, [url]);

  return { holderRef, status };
}

function Message({ status }: { status: Status }) {
  if (status === "loading") return <p className="py-10 text-center text-sm text-cream/80">Loading…</p>;
  if (status === "error") return <p className="py-10 text-center text-sm text-cream/80">Couldn&apos;t load this file.</p>;
  return null;
}

function PdfPages({ url }: { url: string }) {
  const { holderRef, status } = useRenderInto(url, async (holder, isCancelled) => {
    const pdf = await loadPdf(url);
    const width = Math.min(holder.parentElement?.clientWidth || holder.clientWidth, 900);
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      if (isCancelled()) return;
      const canvas = document.createElement("canvas");
      canvas.className = "mx-auto mb-3 block rounded bg-white shadow-lg";
      holder.appendChild(canvas);
      await drawPage(page, canvas, width);
    }
  });
  return (
    <>
      <Message status={status} />
      <div ref={holderRef} />
    </>
  );
}

function DocxPages({ url }: { url: string }) {
  const { holderRef, status } = useRenderInto(url, async (holder) => {
    const [{ renderAsync }, data] = await Promise.all([import("docx-preview"), fetchBytes(url)]);
    await renderAsync(data, holder, undefined, {
      className: "docx-preview",
      inWrapper: true,
      ignoreWidth: false,
      breakPages: true,
    });
  });
  return (
    <>
      <Message status={status} />
      <div ref={holderRef} className="docx-holder overflow-x-auto" />
    </>
  );
}

function PptxSlides({ url }: { url: string }) {
  const { holderRef, status } = useRenderInto(url, async (holder) => {
    const [{ init }, data] = await Promise.all([import("pptx-preview"), fetchBytes(url)]);
    const width = Math.min(holder.parentElement?.clientWidth || holder.clientWidth, 900);
    const previewer = init(holder, { width, height: Math.round((width * 9) / 16), mode: "list" });
    await previewer.preview(data);
    // The slide list ships with its own fixed-height scroll box; let the
    // viewer's single scroll area handle scrolling instead.
    holder.querySelectorAll<HTMLElement>(".pptx-preview-wrapper").forEach((w) => {
      w.style.height = "auto";
      w.style.overflow = "visible";
      w.style.background = "transparent";
    });
  });
  return (
    <>
      <Message status={status} />
      <div ref={holderRef} className="mx-auto" />
    </>
  );
}

type Sheet = { sheet: string; data: unknown[][] };

function SheetTables({ url }: { url: string }) {
  const [sheets, setSheets] = useState<Sheet[] | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ default: readXlsxFile }, data] = await Promise.all([import("read-excel-file/browser"), fetchBytes(url)]);
        const result = (await readXlsxFile(new Blob([data]))) as unknown as Sheet[];
        if (cancelled) return;
        setSheets(result);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <>
      <Message status={status} />
      {sheets?.map((s) => (
        <TableBlock key={s.sheet} name={sheets.length > 1 ? s.sheet : undefined} rows={s.data} />
      ))}
    </>
  );
}

function cellText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toLocaleDateString("en-US");
  return String(v);
}

const MAX_ROWS = 500;

function TableBlock({ name, rows }: { name?: string; rows: unknown[][] }) {
  const shown = rows.slice(0, MAX_ROWS);
  return (
    <div className="mb-4 rounded-lg bg-white p-3 shadow-lg">
      {name && <p className="mb-2 text-sm font-semibold text-primary">{name}</p>}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs text-ink">
          <tbody>
            {shown.map((row, i) => (
              <tr key={i} className={i === 0 ? "bg-cream-dark/50 font-semibold" : "border-t border-cream-dark"}>
                {row.map((cell, j) => (
                  <td key={j} className="whitespace-nowrap px-2 py-1">
                    {cellText(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > MAX_ROWS && (
        <p className="mt-2 text-xs text-ink-soft">Showing the first {MAX_ROWS} rows. Download for the rest.</p>
      )}
    </div>
  );
}

/** Minimal CSV reader: handles quoted fields, escaped quotes, and
 * newlines inside quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function TextContent({ url, asCsv }: { url: string; asCsv: boolean }) {
  const [text, setText] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("couldn't load file");
        const body = await res.text();
        if (cancelled) return;
        setText(body);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <>
      <Message status={status} />
      {text !== null &&
        (asCsv ? (
          <TableBlock rows={parseCsv(text)} />
        ) : (
          <pre className="whitespace-pre-wrap break-words rounded-lg bg-white p-4 text-sm text-ink shadow-lg">{text}</pre>
        ))}
    </>
  );
}

function Viewer({ url, title, kind, onClose }: { url: string; title: string; kind: PreviewKind; onClose: () => void }) {
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
      aria-label={title}
      className="fixed inset-0 z-[100] flex flex-col items-center bg-black/70 px-3 pb-4 pt-16 backdrop-blur-md sm:px-6"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="close preview"
        className="fixed right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
      >
        <X size={20} />
      </button>

      <div
        className="min-h-0 w-full max-w-4xl flex-1 overflow-y-auto overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {kind === "pdf" && <PdfPages url={url} />}
        {kind === "docx" && <DocxPages url={url} />}
        {kind === "pptx" && <PptxSlides url={url} />}
        {kind === "xlsx" && <SheetTables url={url} />}
        {kind === "csv" && <TextContent url={url} asCsv />}
        {kind === "text" && <TextContent url={url} asCsv={false} />}
        {kind === "image" && (
          // eslint-disable-next-line @next/next/no-img-element -- served from our own access-checked route
          <img src={url} alt={title} className="mx-auto h-auto max-w-full rounded bg-white shadow-lg" />
        )}
      </div>

      <p className="mt-3 max-w-full truncate px-2 text-sm text-cream/80" onClick={(e) => e.stopPropagation()}>
        {title}
      </p>
    </div>,
    document.body
  );
}

function KindIcon({ kind }: { kind: PreviewKind | null }) {
  if (kind === "xlsx" || kind === "csv") return <FileSpreadsheet className="text-primary" size={24} />;
  if (kind === "pptx") return <Presentation className="text-primary" size={24} />;
  return <FileText className="text-primary" size={24} />;
}

export default function DocumentPreview({ id, title, mimeType, fileName }: Props) {
  const [open, setOpen] = useState(false);
  const kind = previewKind(mimeType, fileName);
  const url = `/portal/documents/${id}/preview`;

  if (!kind) {
    return (
      <div className="flex h-20 w-16 shrink-0 items-center justify-center rounded-md border border-cream-dark bg-cream-dark/40">
        <KindIcon kind={null} />
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`preview ${title}`}
        className="group relative h-20 w-16 shrink-0 overflow-hidden rounded-md border border-cream-dark bg-white hover:border-primary"
      >
        {kind === "pdf" ? (
          <PdfThumbnail url={url} />
        ) : kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element -- served from our own access-checked route
          <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-cream-dark/40">
            <KindIcon kind={kind} />
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
          <Eye size={18} />
        </span>
      </button>
      {open && <Viewer url={url} title={title} kind={kind} onClose={() => setOpen(false)} />}
    </>
  );
}
