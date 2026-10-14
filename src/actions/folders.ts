"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { documentFolders, documents } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

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
  await logActivity({ actorId: session.user.id, category: "folder", summary: `Created the folder "${name}"` });
  revalidatePath("/portal/documents");
}

export async function renameFolder(folderId: string, formData: FormData) {
  const { session } = await requireStaff();
  const name = cleanName(formData.get("name"));
  const before = await db.query.documentFolders.findFirst({ where: eq(documentFolders.id, folderId) });
  await logActivity({ actorId: session.user.id, category: "folder", summary: `Renamed the folder "${before?.name ?? "?"}" to "${name}"` });
  await db.update(documentFolders).set({ name }).where(eq(documentFolders.id, folderId));
  revalidatePath("/portal/documents");
}

/** Deleting a folder never deletes documents — they just become unfiled. */
export async function deleteFolder(folderId: string) {
  const { session } = await requireStaff();
  const before = await db.query.documentFolders.findFirst({ where: eq(documentFolders.id, folderId) });
  if (before) await logActivity({ actorId: session.user.id, category: "folder", summary: `Deleted the folder "${before.name}" (its documents became unfiled)` });
  await db.delete(documentFolders).where(eq(documentFolders.id, folderId));
  revalidatePath("/portal/documents");
}

/** Move a document into a folder (or out of any folder, with an empty id). */
export async function moveDocument(documentId: string, formData: FormData) {
  const { session } = await requireStaff();
  const raw = String(formData.get("folderId") ?? "");
  let folderId: string | null = null;
  if (raw) {
    const folder = await db.query.documentFolders.findFirst({ where: eq(documentFolders.id, raw) });
    if (!folder) throw new Error("that folder doesn't exist");
    folderId = folder.id;
  }
  const doc = await db.query.documents.findFirst({ where: eq(documents.id, documentId), columns: { title: true } });
  await db.update(documents).set({ folderId }).where(eq(documents.id, documentId));
  const folderName = folderId ? (await db.query.documentFolders.findFirst({ where: eq(documentFolders.id, folderId) }))?.name : null;
  await logActivity({
    actorId: session.user.id,
    category: "folder",
    summary: folderName ? `Moved "${doc?.title}" into the folder "${folderName}"` : `Took "${doc?.title}" out of its folder`,
  });
  revalidatePath("/portal/documents");
}
