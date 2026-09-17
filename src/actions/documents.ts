"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { documents, residentProfiles, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { sendEmail, documentUpdateTemplate } from "@/lib/email";
import type { DocCategory, DocVisibility } from "@/db/schema";

export type DocumentFormState = { ok: boolean; error?: string };

export async function uploadDocument(
  _prev: DocumentFormState,
  formData: FormData
): Promise<DocumentFormState> {
  const session = await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const category = formData.get("category") as DocCategory;
  const visibility = formData.get("visibility") as DocVisibility;
  const file = formData.get("file") as File | null;
  const notifyAffected = formData.get("notifyAffected") === "on";

  if (!title || !category || !visibility) {
    return { ok: false, error: "title, category, and visibility are required" };
  }
  if (!file || file.size === 0) {
    return { ok: false, error: "choose a file (form/pdf/doc) to upload" };
  }
  // Stored directly in Postgres for a zero-extra-service test deploy — see
  // README for swapping to object storage once real files get large. No
  // file-type restriction beyond what the browser's file picker suggests
  // (see the `accept` list on the upload form) — any document, image, or
  // office file type is accepted; only size is capped here.
  if (file.size > 20 * 1024 * 1024) {
    return { ok: false, error: "file is larger than the 20MB limit" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const [doc] = await db
    .insert(documents)
    .values({
      title,
      category,
      visibility,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      fileData: buffer,
      fileSize: file.size,
      uploadedById: session.user.id,
    })
    .returning();

  if (notifyAffected) {
    const recipients = await db
      .select({ contactEmail: residentProfiles.contactEmail, email: users.email })
      .from(residentProfiles)
      .innerJoin(users, eq(residentProfiles.userId, users.id));
    const emails = recipients.map((r) => r.contactEmail ?? r.email);
    if (emails.length > 0) {
      await sendEmail({
        to: emails,
        subject: `Document Update: ${doc.title}`,
        html: documentUpdateTemplate(doc.title),
      });
    }
  }

  revalidatePath("/portal/documents");
  revalidatePath("/portal/admin/documents");
  return { ok: true };
}

export async function deleteDocument(id: string) {
  await requireAdmin();
  await db.delete(documents).where(eq(documents.id, id));
  revalidatePath("/portal/documents");
  revalidatePath("/portal/admin/documents");
}
