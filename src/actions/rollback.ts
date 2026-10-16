"use server";

import { revalidatePath } from "next/cache";
import { arrayOverlaps } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { requireStepUp } from "@/lib/stepUp";
import { logActivity } from "@/lib/activity";
import { historySince, runRollback, type RollbackLine } from "@/lib/history";
import { easternToDate, fmtDateTime } from "@/lib/time";
import { sendEmail, securityNoticeTemplate } from "@/lib/email";

const REQUIRED_PHRASE = "ROLL BACK";

const tableLabel: Record<string, string> = {
  users: "Accounts",
  resident_profiles: "Resident profiles",
  admin_accounts: "Admin profiles",
  document_folders: "Document folders",
  documents: "Documents",
  announcements: "Announcements",
  leads: "Leads",
  admin_notes: "Admin notes",
  communication_logs: "Communication logs",
  document_folder_notes: "Folder notes",
  forms: "Forms",
  form_submissions: "Filled-out forms",
};

export type PreviewLine = { label: string; removed: number; restored: number; changed: number };
export type PreviewResult =
  | { ok: true; whenText: string; lines: PreviewLine[]; total: number }
  | { ok: false; error: string };

function toLines(lines: RollbackLine[]): PreviewLine[] {
  return lines.map((l) => ({ label: tableLabel[l.tbl] ?? l.tbl, removed: l.removed, restored: l.restored, changed: l.changed }));
}

/** Turn what was typed (Eastern date + time) into a moment we can actually go
 * back to, or say why not. */
async function resolveMoment(date: string, time: string): Promise<{ at: Date } | { error: string }> {
  const at = easternToDate(String(date ?? ""), String(time ?? ""));
  if (!at) return { error: "Choose a date and a time." };
  if (at.getTime() > Date.now()) return { error: "Choose a moment that has already passed." };
  const since = await historySince();
  if (!since) return { error: "The change history isn't set up yet. Run the updated SQL 10 in Supabase first." };
  if (at.getTime() < since.getTime()) {
    return { error: `History only goes back to ${fmtDateTime(since)} (Eastern). Choose a later time.` };
  }
  return { at };
}

/** Step 1: show what would happen, change nothing. */
export async function previewRollback(date: string, time: string): Promise<PreviewResult> {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return { ok: false, error: "Only admins can roll the site back." };
  }
  const m = await resolveMoment(date, time);
  if ("error" in m) return { ok: false, error: m.error };
  try {
    const lines = toLines(await runRollback(m.at, true, admin.user.id));
    const total = lines.reduce((n, l) => n + l.removed + l.restored + l.changed, 0);
    return { ok: true, whenText: fmtDateTime(m.at), lines, total };
  } catch (e) {
    console.error("[rollback] preview failed", e);
    return { ok: false, error: "Couldn't work that out. Nothing was changed." };
  }
}

export type RollbackResult = { ok: true; whenText: string; lines: PreviewLine[] } | { ok: false; error: string };

/** Step 2: do it. Admin only, needs a fresh two-step code and the typed phrase. */
export async function performRollback(date: string, time: string, typed: string): Promise<RollbackResult> {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return { ok: false, error: "Only admins can roll the site back." };
  }
  try {
    await requireStepUp(admin.user.id);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Locked." };
  }
  if (String(typed ?? "").trim().toUpperCase() !== REQUIRED_PHRASE) {
    return { ok: false, error: `Type ${REQUIRED_PHRASE} to confirm.` };
  }
  const m = await resolveMoment(date, time);
  if ("error" in m) return { ok: false, error: m.error };

  let lines: PreviewLine[];
  try {
    lines = toLines(await runRollback(m.at, false, admin.user.id));
  } catch (e) {
    if (e instanceof Error && e.message.includes("ROLLBACK_WOULD_REMOVE_ADMIN")) {
      return { ok: false, error: "That would leave you (or the site) without an admin, so nothing was changed. Choose a later time." };
    }
    console.error("[rollback] failed", e);
    return { ok: false, error: "The rollback failed and nothing was changed." };
  }

  const whenText = fmtDateTime(m.at);
  const summary = lines.length
    ? lines.map((l) => `${l.label}: ${l.restored} brought back, ${l.removed} removed, ${l.changed} changed`).join("; ")
    : "nothing needed to change";
  await logActivity({
    actorId: admin.user.id,
    category: "rollback",
    summary: `Rolled the site back to ${whenText} Eastern (${summary})`,
  });

  // Tell the other staff, so a rollback is never a quiet event.
  try {
    const staff = await db
      .select({ email: users.email })
      .from(users)
      .where(arrayOverlaps(users.roles, ["ADMIN", "DIRECTOR"]));
    for (const s of staff) {
      await sendEmail({
        to: s.email,
        subject: "The Tazewell Place site was rolled back",
        html: securityNoticeTemplate(
          `An administrator rolled the website's records back to ${whenText} (Eastern time). Anything added or changed after then was undone. Details are in the Activity log.`
        ),
      });
    }
  } catch (e) {
    console.error("[rollback] notice failed", e);
  }

  revalidatePath("/", "layout");
  return { ok: true, whenText, lines };
}
