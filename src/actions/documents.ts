"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { documents, residentProfiles, users } from "@/db/schema";
import { requireSignedIn, getFreshRoles } from "@/lib/auth";
import { sendEmail, documentUpdateTemplate } from "@/lib/email";
import { isAllowedDocumentFile } from "@/lib/fileTypes";
import type { DocCategory, DocVisibility } from "@/db/schema";

export type DocumentFormState = { ok: boolean; error?: string };

/** Everyone with a login can upload — owners and renters, not just admins.
 * The difference is what it defaults to: an admin picks who sees it (all
 * residents, one role, one specific resident, or admins only — e.g. a new
 * agreement everyone needs). A resident isn't given that choice at all —
 * whatever they upload is forced to "PERSONAL" and assigned to themselves,
 * so it's automatically exclusive to them and admins, the same as any other
 * personal document. Their own `visibility`/`assignedToId` fields are never
 * read, so there's nothing to trust (or fake) from that side. */
export async function uploadDocument(
  _prev: DocumentFormState,
  formData: FormData
): Promise<DocumentFormState> {
  const session = await requireSignedIn();
  const roles = await getFreshRoles(session.user.id);
  const isAdmin = roles.includes("ADMIN");

  const title = String(formData.get("title") ?? "").trim();
  const category = formData.get("category") as DocCategory;
  const file = formData.get("file") as File | null;
  const notifyAffected = isAdmin && formData.get("notifyAffected") === "on";

  if (!title || !category) {
    return { ok: false, error: "title and category are required" };
  }
  if (!file || file.size === 0) {
    return { ok: false, error: "choose a file (form/pdf/doc) to upload" };
  }

  let visibility: DocVisibility;
  let assignedToId: string | null;
  if (isAdmin) {
    visibility = formData.get("visibility") as DocVisibility;
    if (!visibility) {
      return { ok: false, error: "visibility is required" };
    }
    // "Personal" needs one specific resident attached — never trust a
    // client-supplied id for anything else, so this is ignored unless
    // visibility is actually "PERSONAL".
    assignedToId = null;
    if (visibility === "PERSONAL") {
      const candidateId = String(formData.get("assignedToId") ?? "").trim();
      if (!candidateId) {
        return { ok: false, error: "choose which resident this personal document is for" };
      }
      const resident = await db.query.residentProfiles.findFirst({
        where: eq(residentProfiles.userId, candidateId),
      });
      if (!resident) {
        return { ok: false, error: "that resident couldn't be found" };
      }
      assignedToId = candidateId;
    }
  } else {
    visibility = "PERSONAL";
    assignedToId = session.user.id;
  }

  // Stored directly in Postgres for a zero-extra-service test deploy — see
  // README for swapping to object storage once real files get large.
  //
  // Real allow-list, not just what the `accept` attribute on the form
  // suggests — that's a UI hint, not a check, so it's enforced again here.
  // Deliberately excludes SVG and anything HTML/script-bearing: this app
  // serves a file back with its original content-type, and a preview opens
  // it inline — a malicious file dressed as an image or document could
  // otherwise run as this site. See src/lib/fileTypes.ts.
  if (!isAllowedDocumentFile(file.type, file.name)) {
    return { ok: false, error: "that file type isn't supported — try a PDF, Office document, or a JPEG/PNG/WebP/GIF image" };
  }

  // 4MB, not 20MB: Vercel's serverless functions hard-cap every request
  // body (including this one) at 4.5MB, and that ceiling can't be raised —
  // see next.config.ts. 4MB leaves headroom under that for the rest of the
  // form. The upload form also checks this client-side (and shrinks images
  // automatically) so this is a backstop, not the first line of defense.
  if (file.size > 4 * 1024 * 1024) {
    return { ok: false, error: "file is larger than the 4MB limit" };
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
      assignedToId,
    })
    .returning();

  if (notifyAffected) {
    const recipients =
      doc.visibility === "PERSONAL"
        ? await db
            .select({ contactEmail: residentProfiles.contactEmail, email: users.email })
            .from(residentProfiles)
            .innerJoin(users, eq(residentProfiles.userId, users.id))
            .where(eq(residentProfiles.userId, doc.assignedToId!))
        : await db
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

/** Admins can delete anything. A resident can only delete a document they
 * uploaded themselves — since residents can now upload their own personal
 * documents, this is what lets them undo a mistake without needing an
 * admin, while never letting them touch anything an admin (or another
 * resident) posted. */
export async function deleteDocument(id: string) {
  const session = await requireSignedIn();
  const roles = await getFreshRoles(session.user.id);
  const isAdmin = roles.includes("ADMIN");

  if (!isAdmin) {
    const doc = await db.query.documents.findFirst({ where: eq(documents.id, id) });
    if (!doc || doc.uploadedById !== session.user.id) {
      throw new Error("you can only delete documents you uploaded yourself");
    }
  }

  await db.delete(documents).where(eq(documents.id, id));
  revalidatePath("/portal/documents");
  revalidatePath("/portal/admin/documents");
}
