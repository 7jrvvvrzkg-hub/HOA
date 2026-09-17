import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth/next";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
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

        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email.toLowerCase().trim()),
          with: { residentProfile: true, adminAccount: true },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        const displayName =
          user.adminAccount?.fullName ?? user.residentProfile?.fullName ?? user.email;

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
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.roles = (token.roles as RoleTag[]) ?? [];
      }
      return session;
    },
  },
};

export function getSession() {
  return getServerSession(authOptions);
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
