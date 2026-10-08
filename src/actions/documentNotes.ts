"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { documentFolderNotes } from "@/db/schema";
import { requireStaff } from "@/lib/auth";

/** Staff: set (or replace) the note shown to one resident under one document
 * folder on their own Documents page — "please upload your updated insurance
 * certificate" and the like. One note per resident per folder; writing again
 * just replaces it rather than piling up a thread. */
export async function setDocumentFolderNote(
  residentUserId: string,
  folderId: string,
  formData: FormData
) {
  const { session } = await requireStaff();
  const message = String(formData.get("message") ?? "").trim().slice(0, 1000);
  if (!message) {
    await clearDocumentFolderNote(residentUserId, folderId);
    return;
  }

  await db
    .insert(documentFolderNotes)
    .values({ residentUserId, folderId, message, authorId: session.user.id })
    .onConflictDoUpdate({
      target: [documentFolderNotes.residentUserId, documentFolderNotes.folderId],
      set: { message, authorId: session.user.id, updatedAt: new Date() },
    });

  revalidatePath("/portal/documents");
  revalidatePath(`/portal/admin/users`);
}

export async function clearDocumentFolderNote(residentUserId: string, folderId: string) {
  await requireStaff();
  await db
    .delete(documentFolderNotes)
    .where(and(eq(documentFolderNotes.residentUserId, residentUserId), eq(documentFolderNotes.folderId, folderId)));
  revalidatePath("/portal/documents");
  revalidatePath(`/portal/admin/users`);
}
