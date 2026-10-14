"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import type { LeadStatus } from "@/db/schema";

export async function updateLeadStatus(id: string, status: LeadStatus) {
  const { session } = await requireStaff();
  const lead = await db.query.leads.findFirst({ where: eq(leads.id, id), columns: { name: true } });
  await db.update(leads).set({ status, updatedAt: new Date() }).where(eq(leads.id, id));
  await logActivity({ actorId: session.user.id, category: "lead", summary: `Marked the lead from ${lead?.name ?? "someone"} as ${status.toLowerCase().replace(/_/g, " ")}` });
  revalidatePath("/portal", "layout");
}

export async function assignLeadToSelf(id: string) {
  const { session } = await requireStaff();
  const lead = await db.query.leads.findFirst({ where: eq(leads.id, id), columns: { name: true } });
  await db.update(leads).set({ assignedToId: session.user.id }).where(eq(leads.id, id));
  await logActivity({ actorId: session.user.id, category: "lead", summary: `Took the lead from ${lead?.name ?? "someone"}` });
  revalidatePath("/portal", "layout");
}

export async function deleteLead(id: string) {
  const { session } = await requireStaff();
  const lead = await db.query.leads.findFirst({ where: eq(leads.id, id), columns: { name: true } });
  await db.delete(leads).where(eq(leads.id, id));
  await logActivity({ actorId: session.user.id, category: "lead", summary: `Deleted the lead from ${lead?.name ?? "someone"}` });
  revalidatePath("/portal", "layout");
}
