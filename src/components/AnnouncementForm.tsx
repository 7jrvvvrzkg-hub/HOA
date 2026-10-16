"use client";

import { useActionState, useRef, useState } from "react";
import { createAnnouncement, updateAnnouncement, type AnnouncementFormState } from "@/actions/announcements";
import { Button } from "@/components/Button";
import { announcementPriorityLabels, announcementAudienceLabels } from "@/lib/labels";
import { compressImageIfNeeded } from "@/lib/compressImage";
import type { DocVisibility } from "@/db/schema";

const initialState: AnnouncementFormState = { ok: false };

type Existing = {
  id: string;
  title: string;
  body: string;
  priority: "NORMAL" | "IMPORTANT" | "URGENT";
  pinned: boolean;
  active: boolean;
  // Typed as the full DocVisibility union since that's what the `announcements`
  // table's `audience` column shares with `documents.visibility` — "PERSONAL"
  // is simply never one of the options rendered below (see
  // announcementAudienceLabels), so an existing announcement can never
  // actually carry it in practice.
  audience: DocVisibility;
  /** Address of the current picture, if it has one. */
  imageUrl?: string | null;
};

export default function AnnouncementForm({ existing, allowAdminOnly = true }: { existing?: Existing; allowAdminOnly?: boolean }) {
  const action = existing ? updateAnnouncement.bind(null, existing.id) : createAnnouncement;
  const [state, formAction, pending] = useActionState(action, initialState);
  const fileRef = useRef<HTMLInputElement>(null);
  const [imgError, setImgError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeCurrent, setRemoveCurrent] = useState(false);

  async function onPick() {
    const input = fileRef.current;
    const file = input?.files?.[0];
    setImgError(null);
    setPreview(null);
    if (!input || !file) return;
    setProcessing(true);
    // Phone photos are huge; shrink in the browser first (the server has a 4MB limit).
    const processed = await compressImageIfNeeded(file, { maxDimension: 1400, skipIfUnder: 700 * 1024 });
    setProcessing(false);
    if (processed.size > 4 * 1024 * 1024) {
      setImgError(`That picture is ${(processed.size / (1024 * 1024)).toFixed(1)}MB even after shrinking. Try a different one.`);
      input.value = "";
      return;
    }
    if (processed !== file) {
      const dt = new DataTransfer();
      dt.items.add(processed);
      input.files = dt.files;
    }
    setPreview(URL.createObjectURL(processed));
    setRemoveCurrent(false);
  }

  return (
    <form action={formAction} className="grid gap-4 rounded-lg border border-cream-dark bg-white p-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-ink">Title</label>
        <input name="title" defaultValue={existing?.title} required className="mt-1 w-full rounded-md border border-cream-dark px-3 py-2 text-sm" />
      </div>
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-ink">Body</label>
        <textarea name="body" defaultValue={existing?.body} required rows={3} className="mt-1 w-full rounded-md border border-cream-dark px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-ink">Priority</label>
        <select name="priority" defaultValue={existing?.priority ?? "NORMAL"} className="mt-1 w-full rounded-md border border-cream-dark px-3 py-2 text-sm">
          {Object.entries(announcementPriorityLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-ink">Audience</label>
        <select name="audience" defaultValue={existing?.audience ?? "ALL_RESIDENTS"} className="mt-1 w-full rounded-md border border-cream-dark px-3 py-2 text-sm">
          {Object.entries(announcementAudienceLabels)
            .filter(([value]) => allowAdminOnly || value !== "ADMIN_ONLY")
            .map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="pinned" defaultChecked={existing?.pinned} /> Pin to top
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={existing?.active ?? true} /> Active
      </label>
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-ink">Picture (optional)</label>
        <p className="mt-0.5 text-xs text-ink-soft">Shows on the right side of the announcement. JPG, PNG, WebP or GIF.</p>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          {(preview || (existing?.imageUrl && !removeCurrent)) && (
            // eslint-disable-next-line @next/next/no-img-element -- local preview / our own DB-backed route
            <img
              src={preview ?? existing?.imageUrl ?? ""}
              alt="Picture preview"
              className="aspect-[4/5] w-20 rounded-xl border border-cream-dark object-cover"
            />
          )}
          <div className="min-w-0 space-y-2">
            <input
              ref={fileRef}
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={onPick}
              className="block max-w-full text-sm text-ink-soft file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:text-cream"
            />
            {processing && <p className="text-xs text-ink-soft">Shrinking the picture...</p>}
            {imgError && <p className="text-xs text-danger" role="alert">{imgError}</p>}
            {existing?.imageUrl && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="removeImage"
                  checked={removeCurrent}
                  onChange={(e) => {
                    setRemoveCurrent(e.target.checked);
                    if (e.target.checked && fileRef.current) {
                      fileRef.current.value = "";
                      setPreview(null);
                    }
                  }}
                />{" "}
                Remove the current picture
              </label>
            )}
          </div>
        </div>
      </div>
      {!existing && (
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="notifyNow" /> Email residents now
        </label>
      )}

      {state.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
      {state.ok && <p className="text-sm text-primary sm:col-span-2">Saved.</p>}

      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending || processing}>
          {pending ? "Saving..." : existing ? "Save Changes" : "Post Announcement"}
        </Button>
      </div>
    </form>
  );
}
