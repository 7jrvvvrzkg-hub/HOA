"use client";

import { useActionState } from "react";
import { createAnnouncement, updateAnnouncement, type AnnouncementFormState } from "@/actions/announcements";
import { Button } from "@/components/Button";

const initialState: AnnouncementFormState = { ok: false };

type Existing = {
  id: string;
  title: string;
  body: string;
  priority: "NORMAL" | "IMPORTANT" | "URGENT";
  pinned: boolean;
  active: boolean;
  audience: "ALL_RESIDENTS" | "OWNERS_ONLY" | "RENTERS_ONLY" | "ADMIN_ONLY";
};

export default function AnnouncementForm({ existing }: { existing?: Existing }) {
  const action = existing ? updateAnnouncement.bind(null, existing.id) : createAnnouncement;
  const [state, formAction, pending] = useActionState(action, initialState);

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
          <option value="NORMAL">normal</option>
          <option value="IMPORTANT">important</option>
          <option value="URGENT">urgent</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-ink">Audience</label>
        <select name="audience" defaultValue={existing?.audience ?? "ALL_RESIDENTS"} className="mt-1 w-full rounded-md border border-cream-dark px-3 py-2 text-sm">
          <option value="ALL_RESIDENTS">all residents</option>
          <option value="OWNERS_ONLY">owners only</option>
          <option value="RENTERS_ONLY">renters only</option>
          <option value="ADMIN_ONLY">admin only</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="pinned" defaultChecked={existing?.pinned} /> Pin to top
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={existing?.active ?? true} /> Active
      </label>
      {!existing && (
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="notifyNow" /> Email residents now
        </label>
      )}

      {state.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
      {state.ok && <p className="text-sm text-primary sm:col-span-2">Saved.</p>}

      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : existing ? "Save Changes" : "Post Announcement"}
        </Button>
      </div>
    </form>
  );
}
