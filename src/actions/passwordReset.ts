"use server";

import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { users, passwordResetTokens } from "@/db/schema";
import { logActivity } from "@/lib/activity";
import { sendEmail, passwordResetTemplate, passwordChangedTemplate } from "@/lib/email";
import { BCRYPT_COST } from "@/lib/auth";
import { passwordProblem } from "@/lib/passwordPolicy";

export type ResetRequestState = { done: boolean };
export type ResetState = { ok: boolean; error?: string };

const TOKEN_LIFETIME_MS = 60 * 60 * 1000;
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

function siteUrl() {
  const fromEnv = process.env.NEXTAUTH_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return fromEnv.replace(/\/+$/, "");
}

/** Step one: someone types their email. The answer is always the same
 * ("if there's an account, we sent a link") so this can't be used to find
 * out which emails have accounts. The link goes only to the account's login
 * email, never to a contact email a person could have changed. */
export async function requestPasswordReset(_prev: ResetRequestState, formData: FormData): Promise<ResetRequestState> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim().slice(0, 254);
  if (!email || !email.includes("@")) return { done: true };

  try {
    const user = await db.query.users.findFirst({ where: eq(users.email, email), columns: { id: true, email: true } });
    if (!user) return { done: true };

    // At most 3 links per account per hour, and 60 in total per hour, so
    // this can't be used to bury someone's inbox or run up the email bill.
    const hourAgo = new Date(Date.now() - TOKEN_LIFETIME_MS);
    const [mine, everyone] = await Promise.all([
      db.$count(passwordResetTokens, and(eq(passwordResetTokens.userId, user.id), gt(passwordResetTokens.createdAt, hourAgo))),
      db.$count(passwordResetTokens, gt(passwordResetTokens.createdAt, hourAgo)),
    ]);
    if (mine >= 3 || everyone >= 60) return { done: true };

    const token = randomBytes(32).toString("base64url");
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TOKEN_LIFETIME_MS),
    });

    const link = `${siteUrl()}/reset-password?token=${token}`;
    const result = await sendEmail({ to: user.email, subject: "Reset your password", html: passwordResetTemplate(link) });
    if (result.skipped && process.env.NODE_ENV !== "production") {
      // Only ever on a developer's machine without an email key.
      console.log(`[password-reset:dev] link for ${user.email}: ${link}`);
    }

    await logActivity({
      actorId: user.id,
      actorLabel: user.email,
      category: "security",
      summary: result.skipped
        ? "Asked to reset their password (email isn't set up yet, so no message was sent)"
        : "Asked to reset their password (link emailed)",
    });
  } catch (e) {
    console.error("[password-reset] request failed", e);
  }
  return { done: true };
}

/** Is this link still good? Used to show the form or an "expired" message. */
export async function resetLinkIsValid(token: string) {
  if (!token || token.length > 200) return false;
  const row = await db.query.passwordResetTokens.findFirst({
    where: and(
      eq(passwordResetTokens.tokenHash, hashToken(token)),
      isNull(passwordResetTokens.usedAt),
      gt(passwordResetTokens.expiresAt, new Date())
    ),
    columns: { id: true },
  });
  return !!row;
}

/** Step two: the link is used to set a new password. One use only; every
 * other outstanding link for the account is cancelled, and anyone signed in
 * with the old password is signed out (see getSession). */
export async function resetPassword(token: string, _prev: ResetState, formData: FormData): Promise<ResetState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password !== confirm) return { ok: false, error: "the two passwords don't match" };

  const expired = { ok: false, error: "this link has expired or was already used — ask for a new one" };
  if (!token || token.length > 200) return expired;

  const row = await db.query.passwordResetTokens.findFirst({
    where: and(
      eq(passwordResetTokens.tokenHash, hashToken(token)),
      isNull(passwordResetTokens.usedAt),
      gt(passwordResetTokens.expiresAt, new Date())
    ),
  });
  if (!row) return expired;

  const owner = await db.query.users.findFirst({ where: eq(users.id, row.userId), columns: { email: true } });
  const problem = passwordProblem(password, { email: owner?.email });
  if (problem) return { ok: false, error: problem };

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const now = new Date();
  // Claim the token and change the password together; claiming first (and
  // checking it still wasn't used) means two simultaneous uses can't both win.
  const claimed = await db.transaction(async (tx) => {
    const taken = await tx
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(and(eq(passwordResetTokens.id, row.id), isNull(passwordResetTokens.usedAt)))
      .returning({ id: passwordResetTokens.id });
    if (taken.length === 0) return false;
    await tx.update(users).set({ passwordHash, passwordChangedAt: now, updatedAt: now, mustChangePassword: false }).where(eq(users.id, row.userId));
    await tx
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(and(eq(passwordResetTokens.userId, row.userId), isNull(passwordResetTokens.usedAt)));
    return true;
  });
  if (!claimed) return expired;

  const user = await db.query.users.findFirst({ where: eq(users.id, row.userId), columns: { email: true } });
  if (user) {
    await logActivity({ actorId: row.userId, actorLabel: user.email, category: "security", summary: "Reset their password with an emailed link" });
    await sendEmail({ to: user.email, subject: "Your password was changed", html: passwordChangedTemplate() });
  }
  return { ok: true };
}

