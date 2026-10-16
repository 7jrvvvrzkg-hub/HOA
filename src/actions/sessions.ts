"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userSessions, users } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { requireStepUp } from "@/lib/stepUp";
import { canManageAccount } from "@/lib/access";
import { logActivity, nameOf } from "@/lib/activity";
import { notifySecurity } from "@/lib/securityNotice";
import { revokeAllSessions, revokeSession } from "@/lib/sessions";

export type SessionResult = { ok: true; message: string } | { ok: false; error: string };

/** May this person end sign-ins of this account? Everyone on staff may end
 * their OWN other sign-ins. Ending someone else's needs the right to manage
 * that account (an admin: any; a director: only one they just created) AND a
 * fresh two-step code. Returned, not thrown, so the message reaches the page. */
async function allowed(targetUserId: string) {
  const { session, roles } = await requireStaff();
  const actor = { id: session.user.id, roles };
  const target = await db.query.users.findFirst({
    where: eq(users.id, targetUserId),
    columns: { id: true, email: true, roles: true, createdById: true, createdAt: true },
  });
  if (!target) return { ok: false, error: "that account no longer exists" } as const;
  const self = target.id === actor.id;
  if (!self) {
    if (!canManageAccount(actor, target)) return { ok: false, error: "you can't end sign-ins for this account" } as const;
    try {
      await requireStepUp(actor.id);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "locked" } as const;
    }
  }
  return { ok: true, actor, target, self, currentSid: session.sid } as const;
}

/** End ONE sign-in. */
export async function endSession(sessionId: string): Promise<SessionResult> {
  const row = await db.query.userSessions.findFirst({ where: eq(userSessions.id, sessionId) });
  if (!row) return { ok: false, error: "that sign-in no longer exists" };
  const a = await allowed(row.userId);
  if (!a.ok) return { ok: false, error: a.error };
  if (row.id === a.currentSid) return { ok: false, error: "that's the device you're on right now — use Sign Out instead" };

  const done = await revokeSession(row.id, a.actor.id, a.self ? "ended by the account holder" : "ended by staff");
  if (!done) return { ok: false, error: "that sign-in had already ended" };

  const what = `${row.device} · ${row.browser ?? "browser"}`;
  await logActivity({
    actorId: a.actor.id,
    category: "security",
    summary: `Ended a sign-in (${what}) for ${await nameOf(row.userId)}`,
  });
  if (!a.self) await notifySecurity(a.target.email, `A sign-in to your account from ${what} was ended by the community office.`);
  revalidatePath(`/portal/admin/users/sessions/${row.userId}`);
  return { ok: true, message: "Signed out that device." };
}

/** End every sign-in of an account (except the one in use, for your own). */
export async function endAllSessions(targetUserId: string): Promise<SessionResult> {
  const a = await allowed(targetUserId);
  if (!a.ok) return { ok: false, error: a.error };
  const n = await revokeAllSessions(
    a.target.id,
    a.actor.id,
    a.self ? "ended by the account holder" : "ended by staff",
    a.self ? a.currentSid : undefined
  );
  await logActivity({
    actorId: a.actor.id,
    category: "security",
    summary: `Ended ${n} sign-in${n === 1 ? "" : "s"} for ${await nameOf(a.target.id)}`,
  });
  if (!a.self && n > 0) await notifySecurity(a.target.email, "All of the places you were signed in to your account were signed out by the community office.");
  revalidatePath(`/portal/admin/users/sessions/${a.target.id}`);
  return { ok: true, message: n ? `Signed out ${n} device${n === 1 ? "" : "s"}.` : "Nothing was signed in." };
}
