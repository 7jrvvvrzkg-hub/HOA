import { cache } from "react";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { documents, documentFolderNotes, forms, formSubmissions, leads } from "@/db/schema";
import { canView, isOwner, isRenter, type SessionRoles } from "@/lib/access";

/** A resident's own upload that nobody on the board has looked at yet. */
export const awaitingReview = and(
  eq(documents.visibility, "PERSONAL"),
  sql`${documents.uploadedById} = ${documents.assignedToId}`,
  isNull(documents.reviewedAt)
);

/** What needs the board's attention right now (admins and directors). */
export const getStaffAttention = cache(async () => {
  const [formCount, leadCount, documentCount] = await Promise.all([
    db.$count(formSubmissions, isNull(formSubmissions.reviewedAt)),
    db.$count(leads, eq(leads.status, "NEW")),
    db.$count(documents, awaitingReview),
  ]);
  return { forms: formCount, leads: leadCount, documents: documentCount, total: formCount + leadCount + documentCount };
});

/** What a resident still has to do: forms they haven't sent in, and folders
 * where the office left a note asking for something they haven't uploaded
 * since. Returns the specific ids so pages can mark the exact spots. */
export const getResidentAttention = cache(async (userId: string, roles: SessionRoles) => {
  if (!isOwner(roles) && !isRenter(roles)) {
    return { formIds: [] as string[], folderIds: [] as string[], forms: 0, documents: 0 };
  }

  const [allForms, mySubmissions, myNotes] = await Promise.all([
    db.select({ id: forms.id, visibility: forms.visibility }).from(forms),
    db.select({ formId: formSubmissions.formId }).from(formSubmissions).where(eq(formSubmissions.submittedById, userId)),
    db
      .select({ folderId: documentFolderNotes.folderId, updatedAt: documentFolderNotes.updatedAt })
      .from(documentFolderNotes)
      .where(eq(documentFolderNotes.residentUserId, userId)),
  ]);

  const submitted = new Set(mySubmissions.map((s) => s.formId));
  const formIds = allForms.filter((f) => canView(roles, f.visibility) && !submitted.has(f.id)).map((f) => f.id);

  const folderIds: string[] = [];
  if (myNotes.length > 0) {
    const noteFolders = myNotes.map((n) => n.folderId);
    const mine = await db
      .select({ folderId: documents.folderId, createdAt: documents.createdAt })
      .from(documents)
      .where(and(eq(documents.uploadedById, userId), inArray(documents.folderId, noteFolders)));
    for (const note of myNotes) {
      const fulfilled = mine.some((d) => d.folderId === note.folderId && d.createdAt > note.updatedAt);
      if (!fulfilled) folderIds.push(note.folderId);
    }
  }
  return { formIds, folderIds, forms: formIds.length, documents: folderIds.length };
});
