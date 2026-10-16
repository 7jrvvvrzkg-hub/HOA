// Server-side allow-lists for uploaded files. The `accept` attribute on a
// file input is a UI hint only — nothing stops a request from claiming any
// mime type it wants, so this is the check that actually matters.
//
// Raster images only, deliberately no `image/svg+xml`: an SVG is a little
// XML document that's allowed to contain a <script> tag, and this app
// serves uploaded files back with their original content-type, inline, from
// its own origin (avatars always inline; documents through the preview
// route). A malicious "photo.svg" opened that way would run as this site,
// with whoever opened it signed in — the classic stored-upload-XSS path.
// Re-encoding everything through <canvas> would dodge this entirely, but
// the client-side compressor already skips small images, so the
// server-side allow-list is the real backstop here, not a client nicety.
export const SAFE_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const SAFE_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

export const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  ...SAFE_IMAGE_MIME_TYPES,
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  "text/plain",
  "text/rtf",
  "application/rtf",
  "text/csv",
  "application/vnd.apple.pages",
]);

const ALLOWED_DOCUMENT_EXTENSIONS = new Set([
  ...SAFE_IMAGE_EXTENSIONS,
  "pdf",
  "doc",
  "docx",
  "pages",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "txt",
  "rtf",
  "csv",
]);

// Types that are safe to hand back to a browser INLINE (a preview, opened
// directly in a tab) rather than as a forced download. PDFs render in the
// browser's own sandboxed viewer; the office formats above can't be
// rendered by a browser at all, so they only ever go out as a download.
export const PREVIEWABLE_MIME_TYPES = new Set([...SAFE_IMAGE_MIME_TYPES, "application/pdf"]);

export type PreviewKind = "image" | "pdf" | "docx" | "xlsx" | "pptx" | "text" | "csv";

/** How the on-site viewer shows a file, or null when a browser can't show
 * it (older Word/Excel/PowerPoint formats and .pages have no reliable
 * in-browser renderer, so those stay download-only). Decided by mime type
 * OR extension, same as the upload allow-list. */
export function previewKind(mimeType: string, filename: string): PreviewKind | null {
  const ext = extensionOf(filename);
  if (SAFE_IMAGE_MIME_TYPES.has(mimeType)) return "image";
  if (mimeType === "application/pdf" || ext === "pdf") return "pdf";
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || ext === "docx") return "docx";
  if (mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || ext === "xlsx") return "xlsx";
  if (mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" || ext === "pptx") return "pptx";
  if (mimeType === "text/csv" || ext === "csv") return "csv";
  if (mimeType === "text/plain" || ext === "txt") return "text";
  if (SAFE_IMAGE_EXTENSIONS.has(ext)) return "image";
  return null;
}

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot + 1).toLowerCase();
}

/** Browsers don't always agree on a mime type for less common formats (a
 * .pages file, for instance, often comes through as a generic
 * "application/octet-stream") — so a file is accepted if EITHER its
 * reported mime type or its extension is on the allow-list below. This is a
 * default-deny allow-list, not a blocklist: since neither list above
 * includes "image/svg+xml", "text/html", ".svg", ".html", or any
 * executable type, all of those are already rejected simply by never
 * matching — nothing extra to special-case. */
export function isAllowedDocumentFile(mimeType: string, filename: string): boolean {
  return ALLOWED_DOCUMENT_MIME_TYPES.has(mimeType) || ALLOWED_DOCUMENT_EXTENSIONS.has(extensionOf(filename));
}

export function isAllowedAvatarImage(mimeType: string, filename: string): boolean {
  return SAFE_IMAGE_MIME_TYPES.has(mimeType) || SAFE_IMAGE_EXTENSIONS.has(extensionOf(filename));
}

const IMAGE_TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

/** The Content-Type the preview route actually sends. NOT just the stored
 * mime type: an upload is accepted when its mime type OR its extension is
 * on the allow-list, so a file named "x.pdf" could have arrived claiming to
 * be "text/html". Echoing that back inline would run it as a web page, so
 * the type sent for anything shown inline is derived from what we decided
 * the file IS (pdf / a safe image), and everything else goes out as an
 * opaque download type. */
export function safeContentType(kind: PreviewKind, mimeType: string, filename: string): string {
  if (kind === "pdf") return "application/pdf";
  if (kind === "image") {
    if (SAFE_IMAGE_MIME_TYPES.has(mimeType)) return mimeType;
    return IMAGE_TYPE_BY_EXTENSION[extensionOf(filename)] ?? "application/octet-stream";
  }
  return "application/octet-stream";
}

/** What an image file REALLY is, judged by its first bytes rather than by
 * what the upload claims. Null for anything that isn't a plain raster image. */
export function sniffImageMime(b: Uint8Array): string | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  if (b.length >= 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 && (b[4] === 0x37 || b[4] === 0x39) && b[5] === 0x61) return "image/gif";
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return null;
}
