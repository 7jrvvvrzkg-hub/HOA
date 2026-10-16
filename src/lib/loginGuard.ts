import { and, asc, eq, gt, isNull, lt, ne } from "drizzle-orm";
import { db } from "@/db";
import { loginAttempts } from "@/db/schema";

// Guessing protection. Attempts are written to the database (not kept in
// memory) because the site runs as many short-lived server instances.
//
// An attempt is RESERVED (written) BEFORE the password or code is checked and
// counted including itself, so a burst of simultaneous guesses can't all slip
// through before any of them is recorded.
//
//  - 5 attempts for one email from one network address within 30 minutes
//    locks that email for that address — so one person hammering an admin's
//    email can't lock the real admin out from somewhere else.
//  - 25 attempts for one email from ALL addresses within 30 minutes locks the
//    email for everyone (a spread-out guessing attack).
//  - 30 attempts from one network address within 30 minutes locks that
//    address out of signing in at all.
// The same rule applies whether or not an account exists with that email, so
// the lockout reveals nothing about who has an account. A locked attempt is
// refused BEFORE the password is checked, so a correct guess during a
// lockout doesn't get in either.
//
// `scope` keeps the sign-in form's counters separate from the counters for
// "change my password" and "change my two-step login" — what a person types
// into the sign-in email box can never collide with those.

export type Scope = "login" | "pw" | "2fa-setup" | "2fa-change";

export const LOCK_WINDOW_MS = 30 * 60 * 1000;
const MAX_PER_EMAIL_AND_IP = 5;
const MAX_PER_EMAIL = 25;
const MAX_PER_IP = 30;

const key = (scope: Scope, id: string) => `${scope}:${id.slice(0, 200)}`;

/** Best available client address. On Vercel the platform sets these headers
 * itself (a client can't forge them); elsewhere they're best-effort. */
export function clientIp(headers: Record<string, string | string[] | undefined> | undefined): string | null {
  if (!headers) return null;
  const pick = (name: string) => {
    const v = headers[name];
    return Array.isArray(v) ? v[0] : v;
  };
  const raw = pick("x-vercel-forwarded-for") ?? pick("x-real-ip") ?? pick("x-forwarded-for");
  if (!raw) return null;
  return raw.split(",")[0].trim().slice(0, 64) || null;
}

/** When a lock lifts: the lock holds while there are MORE than `max` attempts
 * in the window, so it ends when enough of the oldest ones age out. */
function unlockAt(times: Date[], max: number): number {
  // `times` are the attempts BEFORE this one, oldest first.
  const k = times.length - max; // how many must age out (0-based index of the one that frees us)
  const t = times[Math.max(0, Math.min(k, times.length - 1))];
  return t ? t.getTime() + LOCK_WINDOW_MS : Date.now() + LOCK_WINDOW_MS;
}

/** "about 12 minutes" style text for a lock. */
export function waitText(minutes: number) {
  if (minutes <= 1) return "about a minute";
  if (minutes >= 60) return `about ${Math.round(minutes / 60)} hour${minutes >= 90 ? "s" : ""}`;
  return `about ${minutes} minutes`;
}

/** Write this attempt down, then say whether the sender is locked out and, if
 * so, for how many more minutes. A blocked attempt is NOT kept, so hammering
 * the form while locked never makes the wait longer: the lock always ends on
 * its own once the earlier misses are more than 30 minutes old. */
export async function reserveAttempt(scope: Scope, id: string, ip: string | null) {
  const identifier = key(scope, id);
  const [row] = await db.insert(loginAttempts).values({ identifier, ip }).returning({ id: loginAttempts.id });

  const since = new Date(Date.now() - LOCK_WINDOW_MS);
  const recent = and(eq(loginAttempts.identifier, identifier), gt(loginAttempts.createdAt, since));
  const timesOf = async (where: ReturnType<typeof and>) =>
    (
      await db
        .select({ at: loginAttempts.createdAt })
        .from(loginAttempts)
        .where(and(where, ne(loginAttempts.id, row.id)))
        .orderBy(asc(loginAttempts.createdAt))
        .limit(500)
    ).map((r) => r.at);

  // Each rule: the earlier attempts it counts, and how many are allowed.
  const rules: { times: Date[]; max: number }[] = [];
  rules.push({ times: await timesOf(recent), max: MAX_PER_EMAIL });
  if (ip) {
    rules.push({ times: await timesOf(and(recent, eq(loginAttempts.ip, ip))), max: MAX_PER_EMAIL_AND_IP });
    rules.push({ times: await timesOf(and(eq(loginAttempts.ip, ip), gt(loginAttempts.createdAt, since))), max: MAX_PER_IP });
  } else {
    rules.push({ times: rules[0].times, max: MAX_PER_EMAIL_AND_IP });
  }

  let until = 0;
  for (const r of rules) {
    if (r.times.length >= r.max) until = Math.max(until, unlockAt(r.times, r.max));
  }
  const locked = until > 0;

  if (locked) {
    // Don't count a refused attempt against the sender.
    await db.delete(loginAttempts).where(eq(loginAttempts.id, row.id));
  }

  // Sweep old rows now and then so the table can't grow without limit.
  if (Math.random() < 0.05) {
    await db.delete(loginAttempts).where(lt(loginAttempts.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));
  }
  const retryMinutes = locked ? Math.max(1, Math.ceil((until - Date.now()) / 60000)) : 0;
  return { locked, attemptId: row.id, retryMinutes };
}

/** Take back a reservation that turned out not to be a guess (the password
 * was right and the sign-in is just waiting for its second step). */
export async function releaseAttempt(attemptId: string) {
  await db.delete(loginAttempts).where(eq(loginAttempts.id, attemptId));
}

/** After a success: forget this sender's earlier misses for this email. */
export async function clearFailures(scope: Scope, id: string, ip: string | null) {
  await db
    .delete(loginAttempts)
    .where(and(eq(loginAttempts.identifier, key(scope, id)), ip ? eq(loginAttempts.ip, ip) : isNull(loginAttempts.ip)));
}
