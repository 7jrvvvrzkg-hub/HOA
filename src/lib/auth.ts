import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth/next";
import bcrypt from "bcryptjs";
import { cache } from "react";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, activityLog } from "@/db/schema";
import { logActivity } from "@/lib/activity";
import type { RoleTag } from "@/db/schema";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
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
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const attempted = credentials.email.toLowerCase().trim();
        const user = await db.query.users.findFirst({
          where: eq(users.email, attempted),
          with: { residentProfile: true, adminAccount: true },
        });
        if (!user) {
          await logFailedSignIn(attempted, false);
          return null;
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) {
          await logFailedSignIn(attempted, true);
          return null;
        }

        const displayName =
          user.adminAccount?.fullName ?? user.residentProfile?.fullName ?? user.email;

        await logActivity({ actorId: user.id, actorLabel: `${displayName} (${user.email})`, category: "security", summary: "Signed in" });

        return {
          id: user.id,
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
      }
      return session;
    },
  },
};

/** The current session, or null. Beyond what NextAuth checks, this also
 * drops a session whose account was deleted, or whose password was changed
 * after that sign-in — so resetting a password signs out anyone still using
 * the old one. Deduplicated per request. */
export const getSession = cache(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const row = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { passwordChangedAt: true },
  });
  if (!row) return null;
  if (row.passwordChangedAt && (session.signedAt ?? 0) < row.passwordChangedAt.getTime()) return null;
  return session;
});

/** Log a failed sign-in, but stop after 30 in ten minutes so someone
 * hammering the login can't fill the log. Never records the password. */
async function logFailedSignIn(email: string, accountExists: boolean) {
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
    summary: accountExists ? "Failed sign-in (wrong password)" : "Failed sign-in (no account with this email)",
  });
}

/** The session's roles are a snapshot taken at login and baked into the JWT,
 * so they go stale the moment an admin changes someone's role tags — that
 * user's own token still says "ADMIN" until they log out and back in. Any
 * check that gates a real action (not just what to render) needs the roles
 * as they are in the database right now, not what's in the token. */
export async function getFreshRoles(userId: string): Promise<RoleTag[]> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { roles: true },
  });
  return (user?.roles as RoleTag[]) ?? [];
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
