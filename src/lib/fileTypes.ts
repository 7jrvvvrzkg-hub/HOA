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
