import { desc, asc, eq } from "drizzle-orm";
import { getSession, getFreshRoles } from "@/lib/auth";
import { db } from "@/db";
import { documents, residentProfiles, users, documentCategoryNotes } from "@/db/schema";
import { canViewDocument } from "@/lib/access";
import { documentCategoryLabels } from "@/lib/labels";
import { PREVIEWABLE_MIME_TYPES } from "@/lib/fileTypes";
import { deleteDocument } from "@/actions/documents";
import UploadDocumentForm from "@/components/UploadDocumentForm";
import { Button } from "@/components/Button";
import { Download, Eye, FileText, Lock, MessageSquare, User } from "lucide-react";
import type { DocCategory } from "@/db/schema";

export default async function DocumentsPage() {
  const session = await getSession();
  // Fresh from the database, not the session's cached roles — same
  // reasoning as every other access check in this app (see src/lib/auth.ts).
  const roles = await getFreshRoles(session!.user.id);
  const isAdmin = roles.includes("ADMIN");
  const userId = session!.user.id;

  const allDocs = await db.query.documents.findMany({
    orderBy: desc(documents.createdAt),
    with: { assignedTo: { with: { residentProfile: { columns: { fullName: true } } } } },
  });
  const visibleDocs = allDocs.filter((d) => canViewDocument(roles, userId, d));

  // Notes an admin left for THIS person specifically, under a category —
  // shown even for a category that has no documents in it yet, since the
  // point is often "please add one."
  const myNotes = await db.query.documentCategoryNotes.findMany({
    where: eq(documentCategoryNotes.residentUserId, userId),
  });
  const noteByCategory = new Map(myNotes.map((n) => [n.category, n.message]));

  const residents = isAdmin
    ? await db
        .select({ userId: residentProfiles.userId, fullName: residentProfiles.fullName, email: users.email })
        .from(residentProfiles)
        .innerJoin(users, eq(residentProfiles.userId, users.id))
        .orderBy(asc(residentProfiles.fullName))
    : [];

  const byCategory = visibleDocs.reduce<Record<string, typeof visibleDocs>>((acc, doc) => {
    (acc[doc.category] ??= []).push(doc);
    return acc;
  }, {});
  // Make sure a category with a note but zero documents still gets a
  // section, so the note is actually visible.
  for (const category of noteByCategory.keys()) {
    (byCategory[category] ??= []);
  }
  const categoriesToShow = Object.keys(byCategory) as DocCategory[];

  return (
    <div>
      <div className="flex items-center gap-2">
        <Lock className="text-primary" size={22} />
        <h1 className="text-2xl font-bold text-primary">Document Repository</h1>
      </div>
      <p className="mt-1 text-ink-soft">
        Documents available to your role — including anything assigned personally to you.
      </p>

      <div className="mt-6">
        <h2 className="text-lg font-semibold text-primary">Add a Document</h2>
        <div className="mt-3">
          <UploadDocumentForm
            isAdmin={isAdmin}
            residents={residents.map((r) => ({ id: r.userId, label: `${r.fullName} (${r.email})` }))}
          />
        </div>
      </div>

      {categoriesToShow.length === 0 ? (
        <p className="mt-8 rounded-md border border-dashed border-cream-dark p-6 text-ink-soft">
          No documents have been uploaded yet.
        </p>
      ) : (
        <div className="mt-8 space-y-8">
          {categoriesToShow.map((category) => {
            const docs = byCategory[category];
            const note = noteByCategory.get(category);
            return (
              <div key={category}>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
                  {documentCategoryLabels[category] ?? category}
                </h2>
                {note && (
                  <div className="mt-2 flex items-start gap-2 rounded-md border border-accent/40 bg-accent/10 p-3 text-sm text-ink">
                    <MessageSquare size={16} className="mt-0.5 shrink-0 text-accent-dark" />
                    <p><span className="font-medium">Note from the office:</span> {note}</p>
                  </div>
                )}
                {docs.length === 0 ? (
                  <p className="mt-3 rounded-lg border border-dashed border-cream-dark bg-white p-4 text-sm text-ink-soft">
                    Nothing here yet.
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-cream-dark rounded-lg border border-cream-dark bg-white">
                    {docs.map((doc) => {
                      const canDelete = isAdmin || doc.uploadedById === userId;
                      const canPreview = PREVIEWABLE_MIME_TYPES.has(doc.mimeType);
                      return (
                        <li key={doc.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                          <div className="flex items-center gap-3">
                            <FileText className="text-primary" size={20} />
                            <div>
                              <p className="font-medium text-ink">{doc.title}</p>
                              <p className="text-xs text-ink-soft">
                                {(doc.fileSize / 1024).toFixed(0)} kb ·{" "}
                                {doc.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </p>
                              {doc.visibility === "PERSONAL" && (
                                <p className="mt-0.5 flex items-center gap-1 text-xs text-accent-dark">
                                  <User size={12} />
                                  Personal{isAdmin && doc.assignedTo?.residentProfile ? ` — ${doc.assignedTo.residentProfile.fullName}` : ""}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {canPreview && (
                              <a
                                href={`/portal/documents/${doc.id}/preview`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 rounded-md border border-cream-dark px-3 py-1.5 text-sm text-ink hover:border-primary hover:text-primary"
                              >
                                <Eye size={14} /> Preview
                              </a>
                            )}
                            <a
                              href={`/portal/documents/${doc.id}/download`}
                              className="flex items-center gap-1 rounded-md border border-primary px-3 py-1.5 text-sm text-primary hover:bg-primary hover:text-cream"
                            >
                              <Download size={14} /> Download
                            </a>
                            {canDelete && (
                              <form action={deleteDocument.bind(null, doc.id)}>
                                <Button type="submit" size="sm" variant="danger">Delete</Button>
                              </form>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
