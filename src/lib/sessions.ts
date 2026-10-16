import { randomBytes } from "node:crypto";
import { and, desc, eq, isNull, lt, or, sql, ne } from "drizzle-orm";
import { db } from "@/db";
import { userSessions } from "@/db/schema";
import { parseUserAgent, placeFromHeaders } from "@/lib/device";
import { clientIp } from "@/lib/loginGuard";

// One row per sign-in. The login cookie only carries this row's id; the row
// says whether that sign-in is still allowed. That is what lets an admin end
// a single sign-in (a lost phone, a shared computer) without touching the
// account's other devices.

type Headers = Record<string, string | string[] | undefined> | undefined;

export const SESSION_HISTORY_DAYS = 30;

function hdr(h: Headers, name: string) {
  const v = h?.[name];
  return Array.isArray(v) ? v[0] : v;
}

/** Record a new sign-in. Returns the id to put in the login cookie. */
export async function createSession(userId: string, headers: Headers, maxAgeSeconds: number) {
  const id = randomBytes(24).toString("base64url");
  const ua = hdr(headers, "user-agent") ?? null;
  const dev = parseUserAgent(ua);
  const place = placeFromHeaders(headers);
  await db.insert(userSessions).values({
    id,
    userId,
    expiresAt: new Date(Date.now() + maxAgeSeconds * 1000),
    ip: clientIp(headers),
    city: place.city,
    region: place.region,
    country: place.country,
    device: dev.device,
    browser: dev.browser,
    os: dev.os,
    userAgent: ua ? ua.slice(0, 400) : null,
  });

  // Tidy up now and then: forget sessions that ended a month ago, and change
  // history older than a month.
  if (Math.random() < 0.05) {
    try {
      const cutoff = new Date(Date.now() - SESSION_HISTORY_DAYS * 24 * 60 * 60 * 1000);
      await db.delete(userSessions).where(or(lt(userSessions.expiresAt, cutoff), lt(userSessions.revokedAt, cutoff)));
      await db.execute(sql`select journal_purge(${SESSION_HISTORY_DAYS})`);
    } catch (e) {
      console.error("[sessions] cleanup failed", e);
    }
  }
  return id;
}

/** Is this sign-in still allowed? (Exists, belongs to this account, not ended,
 * not expired.) Also notes that it was just used, at most once a minute. */
export async function sessionIsValid(sid: string | undefined, userId: string): Promise<boolean> {
  if (!sid) return false;
  const row = await db.query.userSessions.findFirst({
    where: eq(userSessions.id, sid),
    columns: { userId: true, revokedAt: true, expiresAt: true, lastSeenAt: true },
  });
  if (!row || row.userId !== userId || row.revokedAt || row.expiresAt.getTime() <= Date.now()) return false;
  if (Date.now() - row.lastSeenAt.getTime() > 60_000) {
    try {
      await db.update(userSessions).set({ lastSeenAt: new Date() }).where(eq(userSessions.id, sid));
    } catch {
      /* not worth failing a request over */
    }
  }
  return true;
}

export async function revokeSession(sessionId: string, byUserId: string | null, reason: string) {
  const rows = await db
    .update(userSessions)
    .set({ revokedAt: new Date(), revokedById: byUserId, revokedReason: reason })
    .where(and(eq(userSessions.id, sessionId), isNull(userSessions.revokedAt)))
    .returning({ id: userSessions.id, userId: userSessions.userId });
  return rows[0] ?? null;
}

export async function revokeAllSessions(userId: string, byUserId: string | null, reason: string, exceptId?: string) {
  const rows = await db
    .update(userSessions)
    .set({ revokedAt: new Date(), revokedById: byUserId, revokedReason: reason })
    .where(
      and(
        eq(userSessions.userId, userId),
        isNull(userSessions.revokedAt),
        sql`${userSessions.expiresAt} > now()`,
        exceptId ? ne(userSessions.id, exceptId) : undefined
      )
    )
    .returning({ id: userSessions.id });
  return rows.length;
}

export async function listSessions(userId: string, limit = 40) {
  return db.select().from(userSessions).where(eq(userSessions.userId, userId)).orderBy(desc(userSessions.createdAt)).limit(limit);
}
