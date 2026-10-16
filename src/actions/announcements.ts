"use server";

import { revalidatePath } from "next/cache";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { announcements, residentProfiles, users } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { isAdmin } from "@/lib/access";
import { logActivity } from "@/lib/activity";
import { announcementSchema } from "@/lib/validation";
import { sendEmail, announcementEmailTemplate } from "@/lib/email";
import { ctx, encryptBytes, encryptionConfigured } from "@/lib/crypto";
import { sniffImageMime } from "@/lib/fileTypes";
import type { AnnouncementPriority, DocVisibility } from "@/db/schema";

export type AnnouncementFormState = { ok: boolean; error?: string };

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

type ImageChange =
  | { kind: "none" }
  | { kind: "remove" }
  | { kind: "set"; data: Buffer; mime: string };

/** Read the optional picture off the form. The type is judged by the file's
 * real contents (not its name), and only plain raster images are accepted. */
async function readImage(formData: FormData): Promise<{ change: ImageChange } | { error: string }> {
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_IMAGE_BYTES) return { error: "That picture is too big (4MB at most). Try a smaller one." };
    const data = Buffer.from(await file.arrayBuffer());
    const mime = sniffImageMime(data);
    if (!mime) return { error: "The picture must be a JPG, PNG, WebP or GIF image." };
    if (!encryptionConfigured()) return { error: "Encryption isn't set up on this server yet, so pictures can't be saved." };
    return { change: { kind: "set", data, mime } };
  }
  if (formData.get("removeImage") === "on") return { change: { kind: "remove" } };
  return { change: { kind: "none" } };
}

export async function createAnnouncement(
  _prev: AnnouncementFormState,
  formData: FormData
): Promise<AnnouncementFormState> {
  const { session, roles } = await requireStaff();

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
  if (!isAdmin(roles) && parsed.data.audience === "ADMIN_ONLY") {
    return { ok: false, error: "directors can post to all residents, owners or renters" };
  }

  const img = await readImage(formData);
  if ("error" in img) return { ok: false, error: img.error };

  const newId = crypto.randomUUID();
  const [announcement] = await db
    .insert(announcements)
    .values({
      ...parsed.data,
      id: newId,
      authorId: session.user.id,
      ...(img.change.kind === "set"
        ? {
            imageData: encryptBytes(img.change.data, ctx.announcementImage(newId)),
            imageMimeType: img.change.mime,
            imageSize: img.change.data.length,
          }
        : {}),
    })
    .returning({ id: announcements.id, title: announcements.title, body: announcements.body, audience: announcements.audience });

  await logActivity({ actorId: session.user.id, category: "announcement", summary: `Posted the announcement "${announcement.title}" to ${announcement.audience.toLowerCase().replace(/_/g, " ")}` });

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
  const { session, roles } = await requireStaff();

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

  if (!isAdmin(roles) && parsed.data.audience === "ADMIN_ONLY") {
    return { ok: false, error: "directors can post to all residents, owners or renters" };
  }

  const img = await readImage(formData);
  if ("error" in img) return { ok: false, error: img.error };

  await db
    .update(announcements)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
      ...(img.change.kind === "set"
        ? {
            imageData: encryptBytes(img.change.data, ctx.announcementImage(id)),
            imageMimeType: img.change.mime,
            imageSize: img.change.data.length,
          }
        : img.change.kind === "remove"
          ? { imageData: null, imageMimeType: null, imageSize: null }
          : {}),
    })
    .where(eq(announcements.id, id));

  await logActivity({ actorId: session.user.id, category: "announcement", summary: `Edited the announcement "${parsed.data.title}"` });
  revalidatePath("/");
  revalidatePath("/portal/admin/announcements");
  return { ok: true };
}

export async function deleteAnnouncement(id: string) {
  const { session } = await requireStaff();
  const before = await db.query.announcements.findFirst({ where: eq(announcements.id, id), columns: { title: true } });
  await db.delete(announcements).where(eq(announcements.id, id));
  if (before) await logActivity({ actorId: session.user.id, category: "announcement", summary: `Deleted the announcement "${before.title}"` });
  revalidatePath("/");
  revalidatePath("/portal/admin/announcements");
}

export async function reorderAnnouncement(id: string, direction: "up" | "down") {
  await requireStaff();
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
