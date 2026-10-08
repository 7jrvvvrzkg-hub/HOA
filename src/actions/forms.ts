"use server";

import { revalidatePath } from "next/cache";
import { arrayOverlaps, eq } from "drizzle-orm";
import { db } from "@/db";
import { forms, formSubmissions, users } from "@/db/schema";
import { requireSignedIn, requireStaff, getFreshRoles } from "@/lib/auth";
import { canView } from "@/lib/access";
import { formAnswersSchema } from "@/lib/validation";
import { sendEmail, formSubmittedTemplate, formWithdrawnTemplate } from "@/lib/email";
import type { DocVisibility } from "@/db/schema";

export type UploadFormState = { ok: boolean; error?: string };

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const FORM_VISIBILITIES: DocVisibility[] = ["ALL_RESIDENTS", "OWNERS_ONLY", "RENTERS_ONLY"];
/** How long after sending a resident can still undo a submission. */
const UNDO_WINDOW_MS = 15 * 60 * 1000;

async function displayName(userId: string) {
  const u = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { residentProfile: { columns: { fullName: true } }, adminAccount: { columns: { fullName: true } } },
  });
  return u?.residentProfile?.fullName ?? u?.adminAccount?.fullName ?? u?.email ?? "A resident";
}

/** Staff (admins and directors): add a fillable form. One standard format
 * only — a Word (.docx) file — so every form opens and fills the same way. */
export async function uploadForm(_prev: UploadFormState, formData: FormData): Promise<UploadFormState> {
  const { session } = await requireStaff();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "ALL_RESIDENTS") as DocVisibility;
  const file = formData.get("file") as File | null;

  if (!title) return { ok: false, error: "title is required" };
  if (title.length > 200) return { ok: false, error: "title is too long" };
  if (description.length > 1000) return { ok: false, error: "description is too long" };
  if (!FORM_VISIBILITIES.includes(visibility)) return { ok: false, error: "choose who can see this form" };
  if (!file || file.size === 0) return { ok: false, error: "choose a Word (.docx) file" };
  if (!file.name.toLowerCase().endsWith(".docx")) {
    return { ok: false, error: "forms must be Word (.docx) files" };
  }
  if (file.size > 4 * 1024 * 1024) return { ok: false, error: "file is larger than the 4MB limit" };

  const buffer = Buffer.from(await file.arrayBuffer());
  // A .docx is a zip file; check the real header rather than trusting the name.
  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    return { ok: false, error: "that doesn't look like a real Word (.docx) file" };
  }

  await db.insert(forms).values({
    title,
    description: description || null,
    visibility,
    fileName: file.name,
    mimeType: DOCX_MIME,
    fileData: buffer,
    fileSize: buffer.length,
    uploadedById: session.user.id,
  });

  revalidatePath("/portal/forms");
  revalidatePath("/portal/admin/forms");
  return { ok: true };
}

export async function deleteForm(formId: string) {
  await requireStaff();
  await db.delete(forms).where(eq(forms.id, formId));
  revalidatePath("/portal/forms");
  revalidatePath("/portal/admin/forms");
}

export type SubmitFormResult = { ok: true; submissionId: string } | { ok: false; error: string };

/** Any signed-in person who is allowed to see the form can submit it. The
 * board (admins and directors) is notified by email, and the submission
 * shows up in the admin console's forms inbox right away. */
export async function submitForm(formId: string, answersInput: unknown): Promise<SubmitFormResult> {
  const session = await requireSignedIn();
  const roles = await getFreshRoles(session.user.id);

  const form = await db.query.forms.findFirst({
    where: eq(forms.id, formId),
    columns: { id: true, title: true, visibility: true },
  });
  if (!form || !canView(roles, form.visibility)) return { ok: false, error: "that form isn't available" };

  const parsed = formAnswersSchema.safeParse(answersInput);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid submission" };
  if (!parsed.data.some((a) => a.value.trim() !== "" && a.value !== "No")) {
    return { ok: false, error: "fill in at least one line before submitting" };
  }

  const [submission] = await db
    .insert(formSubmissions)
    .values({
      formId: form.id,
      formTitle: form.title,
      submittedById: session.user.id,
      answers: parsed.data,
    })
    .returning({ id: formSubmissions.id });

  const name = await displayName(session.user.id);
  const board = await db
    .select({ email: users.email })
    .from(users)
    .where(arrayOverlaps(users.roles, ["ADMIN", "DIRECTOR"]));
  if (board.length > 0) {
    await sendEmail({
      to: board.map((b) => b.email),
      subject: `New form submission: ${form.title}`,
      html: formSubmittedTemplate(form.title, name),
    });
  }

  revalidatePath("/portal/admin/forms");
  revalidatePath("/portal/admin");
  return { ok: true, submissionId: submission.id };
}

/** Undo a submission you just sent. Only your own, only until a board member
 * has marked it reviewed, and only for 15 minutes. The board gets a short
 * "withdrawn" email, since the original email can't be taken back. */
export async function undoFormSubmission(submissionId: string): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSignedIn();
  const sub = await db.query.formSubmissions.findFirst({ where: eq(formSubmissions.id, submissionId) });
  if (!sub || sub.submittedById !== session.user.id) return { ok: false, error: "that submission wasn't found" };
  if (sub.reviewedAt) return { ok: false, error: "the board has already opened this one" };
  if (Date.now() - sub.createdAt.getTime() > UNDO_WINDOW_MS) {
    return { ok: false, error: "it's been too long to undo this one" };
  }

  await db.delete(formSubmissions).where(eq(formSubmissions.id, submissionId));

  const name = await displayName(session.user.id);
  const board = await db
    .select({ email: users.email })
    .from(users)
    .where(arrayOverlaps(users.roles, ["ADMIN", "DIRECTOR"]));
  if (board.length > 0) {
    await sendEmail({
      to: board.map((b) => b.email),
      subject: `Form submission withdrawn: ${sub.formTitle}`,
      html: formWithdrawnTemplate(sub.formTitle, name),
    });
  }

  revalidatePath("/portal/admin/forms");
  revalidatePath("/portal/admin");
  return { ok: true };
}

export async function markSubmissionReviewed(submissionId: string, reviewed: boolean) {
  const { session } = await requireStaff();
  await db
    .update(formSubmissions)
    .set(reviewed ? { reviewedAt: new Date(), reviewedById: session.user.id } : { reviewedAt: null, reviewedById: null })
    .where(eq(formSubmissions.id, submissionId));
  revalidatePath("/portal/admin/forms");
  revalidatePath("/portal/admin");
}
