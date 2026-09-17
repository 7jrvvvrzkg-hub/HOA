"use client";

import { useActionState } from "react";
import { uploadDocument, type DocumentFormState } from "@/actions/documents";
import { Button } from "@/components/Button";
import { documentCategoryLabels, docVisibilityLabels } from "@/lib/labels";

const initialState: DocumentFormState = { ok: false };

export default function UploadDocumentForm() {
  const [state, formAction, pending] = useActionState(uploadDocument, initialState);

  return (
    <form action={formAction} className="grid gap-4 rounded-lg border border-cream-dark bg-white p-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-ink">Title</label>
        <input name="title" required className="mt-1 w-full rounded-md border border-cream-dark px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-ink">Category</label>
        <select name="category" required className="mt-1 w-full rounded-md border border-cream-dark px-3 py-2 text-sm">
          {Object.entries(documentCategoryLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-ink">Visibility</label>
        <select name="visibility" required className="mt-1 w-full rounded-md border border-cream-dark px-3 py-2 text-sm">
          {Object.entries(docVisibilityLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-ink">File (any document, image, or common office format — max 20MB)</label>
        <input
          name="file"
          type="file"
          required
          accept=".pdf,.doc,.docx,.pages,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.csv,image/*"
          className="mt-1 w-full text-sm"
        />
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="notifyAffected" /> Email residents who can view this document
      </label>

      {state.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
      {state.ok && <p className="text-sm text-primary sm:col-span-2">Document uploaded.</p>}

      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Uploading..." : "Upload Document"}
        </Button>
      </div>
    </form>
  );
}
