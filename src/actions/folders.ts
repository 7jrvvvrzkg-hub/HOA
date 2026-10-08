"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { documentFolders, documents } from "@/db/schema";
import { requireStaff } from "@/lib/auth";

function cleanName(raw: FormDataEntryValue | null) {
  const name = String(raw ?? "").trim();
  if (!name) throw new Error("give the folder a name");
  if (name.length > 80) throw new Error("folder names can be up to 80 characters");
  return name;
}

/** Staff (admins and directors): make a new folder. */
export async function createFolder(formData: FormData) {
  const { session } = await requireStaff();
  const name = cleanName(formData.get("name"));
  await db.insert(documentFolders).values({ name, createdById: session.user.id });
  revalidatePath("/portal/documents");
}

export async function renameFolder(folderId: string, formData: FormData) {
  await requireStaff();
  const name = cleanName(formData.get("name"));
  await db.update(documentFolders).set({ name }).where(eq(documentFolders.id, folderId));
  revalidatePath("/portal/documents");
}

/** Deleting a folder never deletes documents — they just become unfiled. */
export async function deleteFolder(folderId: string) {
  await requireStaff();
  await db.delete(documentFolders).where(eq(documentFolders.id, folderId));
  revalidatePath("/portal/documents");
}

/** Move a document into a folder (or out of any folder, with an empty id). */
export async function moveDocument(documentId: string, formData: FormData) {
  await requireStaff();
  const raw = String(formData.get("folderId") ?? "");
  let folderId: string | null = null;
  if (raw) {
    const folder = await db.query.documentFolders.findFirst({ where: eq(documentFolders.id, raw) });
    if (!folder) throw new Error("that folder doesn't exist");
    folderId = folder.id;
  }
  await db.update(documents).set({ folderId }).where(eq(documents.id, documentId));
  revalidatePath("/portal/documents");
}
