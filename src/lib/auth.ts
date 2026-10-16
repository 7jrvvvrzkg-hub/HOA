import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth/next";
import bcrypt from "bcryptjs";
import { cache } from "react";
import { redirect } from "next/navigation";
import { isStaff } from "@/lib/access";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, activityLog } from "@/db/schema";
import { logActivity } from "@/lib/activity";
import { clearFailures, clientIp, releaseAttempt, reserveAttempt } from "@/lib/loginGuard";
import { verifySecondFactor } from "@/lib/twoStep";
import { createSession, sessionIsValid } from "@/lib/sessions";
import { notifySecurity } from "@/lib/securityNotice";
import type { RoleTag } from "@/db/schema";

/** How strongly passwords are hashed. 12 is slower for an attacker AND for the
 * server (about a quarter second), which is the point. Older hashes made at
 * 10 still work and are upgraded the next time that person signs in. */
export const BCRYPT_COST = 12;

/** A signed-in session ends after this long no matter what, so a stolen or
 * forgotten browser session dies by itself. */
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

/** Roles that must use two-step login. Staff by default. Set
 * MFA_REQUIRED_ROLES="ADMIN,DIRECTOR,OWNER,RENTER" to require it for everyone. */
export function mfaRequiredRoles(): Set<string> {
  const raw = process.env.MFA_REQUIRED_ROLES ?? "";
  // Staff always need it, whatever this setting says — it can only ADD roles.
  const extra = raw.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  return new Set(["ADMIN", "DIRECTOR", ...extra]);
}

/** A session-signing secret that is missing, short, or still the placeholder
 * from .env.example would let anyone forge a login. Refuse to sign anyone in. */
function weakSecret() {
  const s = process.env.NEXTAUTH_SECRET ?? "";
  return process.env.NODE_ENV === "production" && (s.length < 32 || s.startsWith("place-holder"));
}

function mustEnrollTwoStep(roles: string[], enrolled: boolean) {
  if (enrolled) return false;
  const req = mfaRequiredRoles();
  return roles.some((r) => req.has(r));
}

// Checked against when the email doesn't exist, so a wrong email and a wrong
// password take the same amount of time (otherwise response time reveals
// which emails have accounts).
let dummyHash: string | null = null;
function getDummyHash() {
  dummyHash ??= bcrypt.hashSync("not-a-real-password-just-for-timing", BCRYPT_COST);
  return dummyHash;
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS },
  jwt: { maxAge: SESSION_MAX_AGE_SECONDS },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "email", type: "text" },
        password: { label: "password", type: "password" },
        code: { label: "code", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;
        if (credentials.email.length > 320 || credentials.password.length > 1000) return null;

        if (weakSecret()) {
          console.error("[auth] NEXTAUTH_SECRET is missing, too short (<32 chars) or still the placeholder — sign-in disabled");
          throw new Error("SERVER_MISCONFIGURED");
        }

        const attempted = credentials.email.toLowerCase().trim();
        const ip = clientIp(req?.headers as Record<string, string | string[] | undefined> | undefined);

        // Write this attempt down FIRST, then check whether the sender is
        // locked out — before looking at the password at all.
        const { locked, attemptId, retryMinutes } = await reserveAttempt("login", attempted, ip);
        if (locked) throw new Error(`LOCKED:${retryMinutes}`);

        const user = await db.query.users.findFirst({
          where: eq(users.email, attempted),
          with: { residentProfile: true, adminAccount: true },
        });

        const passwordOk = await bcrypt.compare(credentials.password, user?.passwordHash ?? getDummyHash());
        if (!user || !passwordOk) {
          await logFailedSignIn(attempted, "wrong email or password");
          return null;
        }

        const displayName = user.adminAccount?.fullName ?? user.residentProfile?.fullName ?? user.email;
        const label = `${displayName} (${user.email})`;

        // Second step, for every account that has turned it on (and the
        // sign-in page asks for it when told MFA_REQUIRED).
        if (user.totpEnabledAt) {
          const code = (credentials.code ?? "").trim();
          if (!code) {
            // Right password, now waiting for the code: not a guess.
            await releaseAttempt(attemptId);
            throw new Error("MFA_REQUIRED");
          }
          const used = await verifySecondFactor(user, code);
          if (!used) {
            await logFailedSignIn(attempted, "wrong two-step code");
            throw new Error("MFA_INVALID");
          }
          if (used === "backup") {
            await logActivity({ actorId: user.id, actorLabel: label, category: "security", summary: "Signed in with a backup code" });
            await notifySecurity(user.email, "A one-time backup code was just used to sign in to your account.");
          }
        }

        await clearFailures("login", attempted, ip);
        // They just proved themselves with a fresh code, so sensitive admin
        // actions are unlocked for a few minutes (see src/lib/stepUp.ts).
        if (user.totpEnabledAt) {
          await db.update(users).set({ stepUpAt: new Date() }).where(eq(users.id, user.id));
        }

        // Upgrade an older, cheaper hash now that we have the real password.
        if (bcrypt.getRounds(user.passwordHash) < BCRYPT_COST) {
          try {
            await db
              .update(users)
              .set({ passwordHash: await bcrypt.hash(credentials.password, BCRYPT_COST) })
              .where(eq(users.id, user.id));
          } catch {
            /* not worth failing a sign-in over */
          }
        }

        const sid = await createSession(user.id, req?.headers as Record<string, string | string[] | undefined> | undefined, SESSION_MAX_AGE_SECONDS);
        await logActivity({ actorId: user.id, actorLabel: label, category: "security", summary: "Signed in" });

        return {
          id: user.id,
          sid,
          email: user.email,
          name: displayName,
          roles: user.roles,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.roles = (user as unknown as { roles: RoleTag[] }).roles;
        token.uid = user.id;
        token.sid = (user as unknown as { sid?: string }).sid;
        // When this sign-in happened. Kept across the cookie's automatic
        // refreshes (unlike the JWT's own issued-at), so a password change
        // can tell "signed in before the change" from "signed in after".
        token.signedAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.roles = (token.roles as RoleTag[]) ?? [];
        session.signedAt = token.signedAt;
        session.sid = token.sid;
      }
      return session;
    },
  },
};

export type SecurityGate = "change-password" | "setup-2fa" | null;

/** The signed-in session plus anything still standing between this person and
 * the portal: a temporary password that must be replaced, or two-step login
 * that must be turned on. Also drops a session whose account was deleted,
 * whose password changed after that sign-in, or that is older than the
 * maximum session length. Deduplicated per request. */
export const getSessionState = cache(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const row = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { passwordChangedAt: true, mustChangePassword: true, totpEnabledAt: true, roles: true },
  });
  if (!row) return null;
  // This particular sign-in must still be allowed (an admin or the person
  // themselves can end it from the sessions page / Sign Out).
  if (!(await sessionIsValid(session.sid, session.user.id))) return null;
  const signedAt = session.signedAt ?? 0;
  if (row.passwordChangedAt && signedAt < row.passwordChangedAt.getTime()) return null;
  if (Date.now() - signedAt > SESSION_MAX_AGE_SECONDS * 1000) return null;

  let gate: SecurityGate = null;
  if (row.mustChangePassword) gate = "change-password";
  else if (mustEnrollTwoStep(row.roles, !!row.totpEnabledAt)) gate = "setup-2fa";
  return { session, gate, twoStepOn: !!row.totpEnabledAt };
});

/** The current session, or null. A session that still has a security step
 * outstanding (see SecurityGate) counts as NOT signed in everywhere except
 * the one page that completes that step — so an account with a temporary
 * password, or a staff account without two-step login, can't reach any data,
 * even by calling a download address or server action directly. */
export async function getSession() {
  const s = await getSessionState();
  return s && !s.gate ? s.session : null;
}

/** Log a failed sign-in, but stop after 30 in ten minutes so someone
 * hammering the login can't fill the log. Never records the password. */
async function logFailedSignIn(email: string, why: string) {
  try {
    const since = new Date(Date.now() - 10 * 60 * 1000);
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(activityLog)
      .where(and(eq(activityLog.category, "security"), gt(activityLog.createdAt, since), sql`${activityLog.summary} like 'Failed sign-in%'`));
    if (n >= 30) return;
  } catch {
    return;
  }
  await logActivity({
    actorLabel: email.slice(0, 120),
    category: "security",
    summary: `Failed sign-in (${why})`,
  });
}

/** The session's roles are a snapshot taken at login and baked into the JWT,
 * so they go stale the moment an admin changes someone's role tags — that
 * user's own token still says "ADMIN" until they log out and back in. Any
 * check that gates a real action (not just what to render) needs the roles
 * as they are in the database right now, not what's in the token.
 *
 * Roles that require two-step login are withheld until it is switched on. */
export async function getFreshRoles(userId: string): Promise<RoleTag[]> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { roles: true, totpEnabledAt: true },
  });
  if (!user) return [];
  const roles = user.roles as RoleTag[];
  if (user.totpEnabledAt) return roles;
  const req = mfaRequiredRoles();
  return roles.filter((r) => !req.has(r));
}

/** Anyone signed in at all — owner, renter, or admin. Used where the action
 * itself (not the role) is what narrows what happens, e.g. uploading a
 * document: everyone can do it, but what it defaults to differs by role. */
export async function requireSignedIn() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("not signed in");
  return session;
}

/** Shared admin gate for every mutating server action. Always re-checks the
 * database (see getFreshRoles) instead of trusting the session's cached
 * roles, so a role change by another admin takes effect immediately rather
 * than after the affected user's next login. */
export async function requireAdmin() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("not signed in");
  const roles = await getFreshRoles(session.user.id);
  if (!roles.includes("ADMIN")) throw new Error("admin access required");
  return session;
}

/** Admin or director — the staff gate for everything a director may also do
 * (viewing everything, documents, folders, forms, announcements, creating
 * accounts). Same fresh-from-the-database check as requireAdmin. */
export async function requireStaff() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("not signed in");
  const roles = await getFreshRoles(session.user.id);
  if (!roles.includes("ADMIN") && !roles.includes("DIRECTOR")) throw new Error("staff access required");
  return { session, roles };
}

/** For the top of every admin page. A layout check alone is NOT enough — Next
 * can render a page without re-running its layout — so every page that reads
 * staff-only data asks for itself. Sends everyone else away. */
export async function staffPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  const roles = await getFreshRoles(session.user.id);
  if (!isStaff(roles)) redirect("/portal");
  return { session, roles };
}

/** Same, but only for admins (directors are sent back to the console). */
export async function adminPage() {
  const { session, roles } = await staffPage();
  if (!roles.includes("ADMIN")) redirect("/portal/admin");
  return { session, roles };
}
