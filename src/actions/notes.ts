"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { adminNotes, communicationLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireStaff } from "@/lib/auth";
import { logActivity, nameOf } from "@/lib/activity";
import { residentProfiles } from "@/db/schema";

export async function addAdminNote(profileId: string, formData: FormData) {
  const { session } = await requireStaff();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  await db.insert(adminNotes).values({ profileId, authorId: session.user.id, body });
  const target = await db.query.residentProfiles.findFirst({ where: eq(residentProfiles.id, profileId), columns: { userId: true } });
  await logActivity({ actorId: session.user.id, category: "account", summary: `Added a private note on ${await nameOf(target?.userId)}` });
  revalidatePath(`/portal/admin/users/${profileId}`);
  revalidatePath("/portal/directory");
}

export async function addCommunicationLog(profileId: string, formData: FormData) {
  const { session } = await requireStaff();
  const channel = String(formData.get("channel") ?? "other");
  const summary = String(formData.get("summary") ?? "").trim();
  if (!summary) return;

  await db.insert(communicationLogs).values({ profileId, authorId: session.user.id, channel, summary });
  const target = await db.query.residentProfiles.findFirst({ where: eq(residentProfiles.id, profileId), columns: { userId: true } });
  await logActivity({ actorId: session.user.id, category: "account", summary: `Logged a ${channel} contact with ${await nameOf(target?.userId)}` });
  revalidatePath(`/portal/admin/users/${profileId}`);
}
