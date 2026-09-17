"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { documentCategoryNotes } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import type { DocCategory } from "@/db/schema";

/** Admin-only: set (or replace) the note shown to one resident under one
 * document category on their own Documents page — "please upload your
 * updated insurance certificate" and the like. One note per resident per
 * category; writing again just replaces it rather than piling up a thread. */
export async function setDocumentCategoryNote(
  residentUserId: string,
  category: DocCategory,
  formData: FormData
) {
  const session = await requireAdmin();
  const message = String(formData.get("message") ?? "").trim();
  if (!message) {
    await clearDocumentCategoryNote(residentUserId, category);
    return;
  }

  await db
    .insert(documentCategoryNotes)
    .values({ residentUserId, category, message, authorId: session.user.id })
    .onConflictDoUpdate({
      target: [documentCategoryNotes.residentUserId, documentCategoryNotes.category],
      set: { message, authorId: session.user.id, updatedAt: new Date() },
    });

  revalidatePath("/portal/documents");
  revalidatePath(`/portal/admin/users`);
}

export async function clearDocumentCategoryNote(residentUserId: string, category: DocCategory) {
  await requireAdmin();
  await db
    .delete(documentCategoryNotes)
    .where(and(eq(documentCategoryNotes.residentUserId, residentUserId), eq(documentCategoryNotes.category, category)));
  revalidatePath("/portal/documents");
  revalidatePath(`/portal/admin/users`);
}
