"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { adminNotes, communicationLogs } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function addAdminNote(profileId: string, formData: FormData) {
  const session = await requireAdmin();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  await db.insert(adminNotes).values({ profileId, authorId: session.user.id, body });
  revalidatePath(`/portal/admin/users/${profileId}`);
}

export async function addCommunicationLog(profileId: string, formData: FormData) {
  const session = await requireAdmin();
  const channel = String(formData.get("channel") ?? "other");
  const summary = String(formData.get("summary") ?? "").trim();
  if (!summary) return;

  await db.insert(communicationLogs).values({ profileId, authorId: session.user.id, channel, summary });
  revalidatePath(`/portal/admin/users/${profileId}`);
}
