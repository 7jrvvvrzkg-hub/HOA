"use server";

import { revalidatePath } from "next/cache";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { announcements, residentProfiles, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { announcementSchema } from "@/lib/validation";
import { sendEmail, announcementEmailTemplate } from "@/lib/email";
import type { AnnouncementPriority, DocVisibility } from "@/db/schema";

export type AnnouncementFormState = { ok: boolean; error?: string };

export async function createAnnouncement(
  _prev: AnnouncementFormState,
  formData: FormData
): Promise<AnnouncementFormState> {
  const session = await requireAdmin();

  const parsed = announcementSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    priority: formData.get("priority"),
    pinned: formData.get("pinned") === "on",
    active: formData.get("active") === "on",
    audience: formData.get("audience"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid submission" };
  }

  const [announcement] = await db
    .insert(announcements)
    .values({ ...parsed.data, authorId: session.user.id })
    .returning();

  const notifyNow = formData.get("notifyNow") === "on";
  if (notifyNow) {
    const recipients = await db
      .select({ contactEmail: residentProfiles.contactEmail, email: users.email })
      .from(residentProfiles)
      .innerJoin(users, eq(residentProfiles.userId, users.id));
    const emails = recipients.map((r) => r.contactEmail ?? r.email);
    if (emails.length > 0) {
      await sendEmail({
        to: emails,
        subject: `New Announcement: ${announcement.title}`,
        html: announcementEmailTemplate(announcement.title, announcement.body),
      });
    }
  }

  revalidatePath("/");
  revalidatePath("/portal/admin/announcements");
  return { ok: true };
}

export async function updateAnnouncement(
  id: string,
  _prev: AnnouncementFormState,
  formData: FormData
): Promise<AnnouncementFormState> {
  await requireAdmin();

  const parsed = announcementSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    priority: formData.get("priority"),
    pinned: formData.get("pinned") === "on",
    active: formData.get("active") === "on",
    audience: formData.get("audience"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid submission" };
  }

  await db
    .update(announcements)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(announcements.id, id));

  revalidatePath("/");
  revalidatePath("/portal/admin/announcements");
  return { ok: true };
}

export async function deleteAnnouncement(id: string) {
  await requireAdmin();
  await db.delete(announcements).where(eq(announcements.id, id));
  revalidatePath("/");
  revalidatePath("/portal/admin/announcements");
}

export async function reorderAnnouncement(id: string, direction: "up" | "down") {
  await requireAdmin();
  const all = await db.select().from(announcements).orderBy(asc(announcements.sortOrder));
  const idx = all.findIndex((a) => a.id === id);
  if (idx === -1) return;
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= all.length) return;

  const a = all[idx];
  const b = all[swapWith];
  await db.transaction(async (tx) => {
    await tx.update(announcements).set({ sortOrder: b.sortOrder }).where(eq(announcements.id, a.id));
    await tx.update(announcements).set({ sortOrder: a.sortOrder }).where(eq(announcements.id, b.id));
  });
  revalidatePath("/");
  revalidatePath("/portal/admin/announcements");
}

export type { AnnouncementPriority, DocVisibility };
