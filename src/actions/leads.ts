"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { getSession } from "@/lib/auth";
import type { LeadStatus } from "@/db/schema";

async function requireAdmin() {
  const session = await getSession();
  if (!session?.user?.roles?.includes("ADMIN")) {
    throw new Error("admin access required");
  }
  return session;
}

export async function updateLeadStatus(id: string, status: LeadStatus) {
  await requireAdmin();
  await db.update(leads).set({ status, updatedAt: new Date() }).where(eq(leads.id, id));
  revalidatePath("/portal/admin/leads");
}

export async function assignLeadToSelf(id: string) {
  const session = await requireAdmin();
  await db.update(leads).set({ assignedToId: session.user.id }).where(eq(leads.id, id));
  revalidatePath("/portal/admin/leads");
}
