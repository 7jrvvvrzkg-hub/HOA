"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import type { LeadStatus } from "@/db/schema";

export async function updateLeadStatus(id: string, status: LeadStatus) {
  await requireStaff();
  await db.update(leads).set({ status, updatedAt: new Date() }).where(eq(leads.id, id));
  revalidatePath("/portal/admin/leads");
}

export async function assignLeadToSelf(id: string) {
  const { session } = await requireStaff();
  await db.update(leads).set({ assignedToId: session.user.id }).where(eq(leads.id, id));
  revalidatePath("/portal/admin/leads");
}

export async function deleteLead(id: string) {
  await requireStaff();
  await db.delete(leads).where(eq(leads.id, id));
  revalidatePath("/portal/admin/leads");
}
