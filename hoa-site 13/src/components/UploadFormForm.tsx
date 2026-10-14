"use client";

import { useActionState } from "react";
import { uploadForm, type UploadFormState } from "@/actions/forms";
import { Button } from "@/components/Button";

const initialState: UploadFormState = { ok: false };

export default function UploadFormForm() {
  const [state, formAction, pending] = useActionState(uploadForm, initialState);

  return (
    <form action={formAction} className="grid gap-4 rounded-lg border border-cream-dark bg-white p-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-ink">Title</label>
        <input name="title" required maxLength={200} className="mt-1 w-full rounded-md border border-cream-dark px-3 py-2 text-sm" />
      </div>
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-ink">Description (optional)</label>
        <input name="description" maxLength={1000} className="mt-1 w-full rounded-md border border-cream-dark px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-ink">Who Can Fill It Out</label>
        <select name="visibility" defaultValue="ALL_RESIDENTS" className="mt-1 w-full rounded-md border border-cream-dark px-3 py-2 text-sm">
          <option value="ALL_RESIDENTS">All Residents</option>
          <option value="OWNERS_ONLY">Owners Only</option>
          <option value="RENTERS_ONLY">Renters Only</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-ink">Word File (.docx, max 4MB)</label>
        <input name="file" type="file" required accept=".docx" className="mt-1 w-full text-sm" />
      </div>
      <p className="text-xs text-ink-soft sm:col-span-2">
        Lines to fill in: a row of underscores (______), a named blank like [[Unit number]], or a checkbox like [ ].
      </p>

      {state.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
      {state.ok && <p className="text-sm text-primary sm:col-span-2">Form added.</p>}

      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Uploading..." : "Add Form"}
        </Button>
      </div>
    </form>
  );
}
