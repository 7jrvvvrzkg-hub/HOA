"use client";

import { useActionState, useRef, useState } from "react";
import { uploadDocument, type DocumentFormState } from "@/actions/documents";
import { Button } from "@/components/Button";
import { documentCategoryLabels, docVisibilityLabels } from "@/lib/labels";
import { compressImageIfNeeded } from "@/lib/compressImage";

const initialState: DocumentFormState = { ok: false };
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const FILE_ACCEPT = ".pdf,.doc,.docx,.pages,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.csv,image/jpeg,image/png,image/webp,image/gif";

export default function UploadDocumentForm({
  isAdmin = false,
  residents = [],
}: {
  /** Everyone can upload, but only an admin gets to choose who sees it — a
   * resident's own upload is always private to just them and admins, so the
   * visibility/resident-picker controls below only render for an admin. */
  isAdmin?: boolean;
  /** Passed in so a "Personal" document can be pointed at one resident.
   * Empty on pages that don't have this list handy — the personal option
   * just won't have anyone to pick until it does. */
  residents?: { id: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState(uploadDocument, initialState);
  const [fileError, setFileError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [visibility, setVisibility] = useState("ALL_RESIDENTS");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange() {
    const input = fileInputRef.current;
    const file = input?.files?.[0];
    setFileError(null);
    if (!input || !file) return;

    setProcessing(true);
    // Photos straight off a phone camera can be 15-25MB — this shrinks them
    // in the browser before they ever go over the wire. Non-image files
    // (PDFs, Word docs, etc.) are left exactly as chosen.
    const processed = await compressImageIfNeeded(file);
    setProcessing(false);

    if (processed.size > MAX_FILE_BYTES) {
      setFileError(
        `"${file.name}" is ${(processed.size / (1024 * 1024)).toFixed(1)}MB — over the 4MB limit. Try a smaller file (for a photo, a lower-resolution version works too).`
      );
      return;
    }

    if (processed !== file) {
      const dt = new DataTransfer();
      dt.items.add(processed);
      input.files = dt.files;
    }
  }

  return (
    <form action={formAction} className="grid gap-4 rounded-lg border border-cream-dark bg-white p-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-ink">Title</label>
        <input name="title" required className="mt-1 w-full rounded-md border border-cream-dark px-3 py-2 text-sm" />
      </div>
      <div className={isAdmin ? "" : "sm:col-span-2"}>
        <label className="block text-sm font-medium text-ink">Category</label>
        <select name="category" required className="mt-1 w-full rounded-md border border-cream-dark px-3 py-2 text-sm">
          {Object.entries(documentCategoryLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      {isAdmin ? (
        <>
          <div>
            <label className="block text-sm font-medium text-ink">Visibility</label>
            <select
              name="visibility"
              required
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="mt-1 w-full rounded-md border border-cream-dark px-3 py-2 text-sm"
            >
              {Object.entries(docVisibilityLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          {visibility === "PERSONAL" && (
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-ink">Which Resident</label>
              <select name="assignedToId" required className="mt-1 w-full rounded-md border border-cream-dark px-3 py-2 text-sm">
                <option value="">Choose a resident…</option>
                {residents.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
              {residents.length === 0 && (
                <p className="mt-1 text-xs text-danger">No residents to choose from yet.</p>
              )}
              <p className="mt-1 text-xs text-ink-soft">
                Only this resident (and admins) will be able to see this document — for something
                like a lease or an individual contract rather than a building-wide document.
              </p>
            </div>
          )}
        </>
      ) : (
        <p className="sm:col-span-2 -mt-1 text-xs text-ink-soft">
          Only you and the admin team can see what you upload here — it&apos;s just for the two of you,
          like a personal lease or a form you&apos;re sending in.
        </p>
      )}
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-ink">File (any document, image, or common office format — max 4MB)</label>
        <input
          ref={fileInputRef}
          name="file"
          type="file"
          required
          accept={FILE_ACCEPT}
          onChange={handleFileChange}
          className="mt-1 w-full text-sm"
        />
        {processing && <p className="mt-1 text-xs text-ink-soft">Preparing file…</p>}
        {fileError && <p className="mt-1 text-xs text-danger">{fileError}</p>}
      </div>
      {isAdmin && (
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="notifyAffected" /> Email residents who can view this document
        </label>
      )}

      {state.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
      {state.ok && <p className="text-sm text-primary sm:col-span-2">Document uploaded.</p>}

      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending || processing || !!fileError}>
          {pending ? "Uploading..." : "Upload Document"}
        </Button>
      </div>
    </form>
  );
}
