import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

// "Are you still you?" for the few actions that would hurt most in the wrong
// hands: setting someone's password, changing roles, deleting accounts,
// resetting someone's two-step login, creating an admin/director. Even with a
// stolen session cookie, these need a fresh 6-digit code from the owner's
// phone. A code entered at sign-in (or on the bar at the top of the admin
// console) unlocks them for 10 minutes.

export const STEP_UP_WINDOW_MS = 10 * 60 * 1000;

export async function stepUpValidUntil(userId: string): Promise<Date | null> {
  const row = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { stepUpAt: true } });
  if (!row?.stepUpAt) return null;
  const until = new Date(row.stepUpAt.getTime() + STEP_UP_WINDOW_MS);
  return until.getTime() > Date.now() ? until : null;
}

export async function requireStepUp(userId: string) {
  if (!(await stepUpValidUntil(userId))) {
    throw new Error("Locked — enter your 6-digit code in the bar at the top of the admin console first.");
  }
}
