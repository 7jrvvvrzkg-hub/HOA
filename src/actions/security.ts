"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, documents, forms, formSubmissions } from "@/db/schema";
import { BCRYPT_COST, getSessionState, getSession, mfaRequiredRoles, requireAdmin } from "@/lib/auth";
import { logActivity, nameOf } from "@/lib/activity";
import {
  ctx,
  currentKeyId,
  decryptBytes,
  decryptJson,
  decryptText,
  encryptBytes,
  encryptJson,
  encryptText,
  encryptionConfigured,
  isEncryptedJson,
  MAGIC_BYTES,
} from "@/lib/crypto";
import { newTotpSecret, otpauthUrl, verifyTotp } from "@/lib/totp";
import { generateRecoveryCodes, totpContext, verifySecondFactor } from "@/lib/twoStep";
import { passwordProblem } from "@/lib/passwordPolicy";
import { notifySecurity } from "@/lib/securityNotice";
import { revokeSession } from "@/lib/sessions";
import { clearFailures, reserveAttempt, waitText, type Scope } from "@/lib/loginGuard";
import { stepUpValidUntil } from "@/lib/stepUp";
import { randomBytes } from "node:crypto";
import type { FormAnswer } from "@/db/schema";

type Result = { ok: true } | { ok: false; error: string };

/** Signed in (even if a security step is still outstanding), with the stored
 * security fields. Rate limiting for wrong password/code guesses on these
 * screens is the same table the sign-in uses. */
async function me() {
  const state = await getSessionState();
  if (!state) throw new Error("not signed in");
  const user = await db.query.users.findFirst({ where: eq(users.id, state.session.user.id) });
  if (!user) throw new Error("not signed in");
  return { state, user };
}

/** Counts this try. If the sender is locked out, says for how long. */
async function tooMany(scope: Scope, email: string): Promise<string | null> {
  const r = await reserveAttempt(scope, email, null);
  return r.locked ? `Too many wrong tries. You can try again in ${waitText(r.retryMinutes)}.` : null;
}

// ---------------------------------------------------------------------------
// Password

export async function changeOwnPassword(current: string, next: string, confirm: string): Promise<Result> {
  const { user } = await me();
  const lock = await tooMany("pw", user.email);
  if (lock) {
    return { ok: false, error: lock };
  }
  if (typeof current !== "string" || typeof next !== "string") return { ok: false, error: "invalid request" };
  if (!(await bcrypt.compare(current, user.passwordHash))) {
    return { ok: false, error: "your current password isn't right" };
  }
  if (next !== confirm) return { ok: false, error: "the two new passwords don't match" };
  if (next === current) return { ok: false, error: "choose a password you haven't been using" };
  const problem = passwordProblem(next, { email: user.email });
  if (problem) return { ok: false, error: problem };

  const now = new Date();
  await db
    .update(users)
    .set({ passwordHash: await bcrypt.hash(next, BCRYPT_COST), passwordChangedAt: now, updatedAt: now, mustChangePassword: false })
    .where(eq(users.id, user.id));
  await clearFailures("pw", user.email, null);
  await logActivity({ actorId: user.id, category: "security", summary: "Changed their own password" });
  await notifySecurity(user.email, "The password for your account was just changed.");
  // Everyone signed in before now (including this browser) is signed out; the
  // page sends them to sign in again with the new password.
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Two-step login

export type SetupStart = { ok: true; secret: string; qr: string } | { ok: false; error: string };

export async function startTwoStepSetup(): Promise<SetupStart> {
  const { state, user } = await me();
  if (state.gate === "change-password") return { ok: false, error: "choose your own password first" };
  if (user.totpEnabledAt) return { ok: false, error: "two-step login is already on" };
  if (!encryptionConfigured()) return { ok: false, error: "secure storage isn't switched on for this site yet — tell the site administrator" };

  const secret = newTotpSecret();
  await db
    .update(users)
    .set({ totpPendingSecret: encryptText(secret, totpContext(user.id)) })
    .where(eq(users.id, user.id));
  const qr = await QRCode.toDataURL(otpauthUrl(secret, user.email), { margin: 1, width: 220 });
  return { ok: true, secret, qr };
}

export type SetupFinish = { ok: true; recoveryCodes: string[] } | { ok: false; error: string };

export async function confirmTwoStepSetup(code: string): Promise<SetupFinish> {
  const { state, user } = await me();
  if (state.gate === "change-password") return { ok: false, error: "choose your own password first" };
  if (user.totpEnabledAt) return { ok: false, error: "two-step login is already on" };
  if (!user.totpPendingSecret) return { ok: false, error: "start the setup again" };

  const lock = await tooMany("2fa-setup", user.email);
  if (lock) {
    return { ok: false, error: lock };
  }

  let secret: string;
  try {
    secret = decryptText(user.totpPendingSecret, totpContext(user.id));
  } catch {
    return { ok: false, error: "start the setup again" };
  }
  const step = verifyTotp(secret, String(code ?? ""));
  if (step === null) {
    return { ok: false, error: "that code didn't match — check your phone's clock and try the newest code" };
  }

  const { plain, hashes } = generateRecoveryCodes();
  // Only switches on if nobody else finished the setup in the meantime.
  const done = await db
    .update(users)
    .set({
      totpSecret: user.totpPendingSecret,
      totpPendingSecret: null,
      totpEnabledAt: new Date(),
      totpLastStep: step,
      stepUpAt: new Date(),
      recoveryCodes: hashes,
    })
    .where(and(eq(users.id, user.id), sql`${users.totpEnabledAt} is null`))
    .returning({ id: users.id });
  if (done.length === 0) return { ok: false, error: "two-step login is already on" };

  await clearFailures("2fa-setup", user.email, null);
  await logActivity({ actorId: user.id, category: "security", summary: "Turned on two-step login" });
  await notifySecurity(user.email, "Two-step login was just turned on for your account.");
  // (No page refresh here on purpose: the screen has to stay put to show the
  // backup codes exactly once.)
  return { ok: true, recoveryCodes: plain };
}

/** Prove it's really you before changing two-step settings: current password
 * AND a current code (or backup code). */
async function confirmIdentity(userId: string, password: string, code: string): Promise<string | null> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return "not signed in";
  {
    const lock = await tooMany("2fa-change", user.email);
    if (lock) return lock;
  }
  const passwordOk = await bcrypt.compare(String(password ?? ""), user.passwordHash);
  const factor = passwordOk && user.totpEnabledAt ? await verifySecondFactor(user, String(code ?? "")) : null;
  if (!passwordOk || !factor) {
    return "your password or code wasn't right";
  }
  await clearFailures("2fa-change", user.email, null);
  return null;
}

export async function disableTwoStep(password: string, code: string): Promise<Result> {
  const { user } = await me();
  if (!user.totpEnabledAt) return { ok: false, error: "two-step login is already off" };
  const required = mfaRequiredRoles();
  if (user.roles.some((r) => required.has(r))) {
    return { ok: false, error: "two-step login is required for your role and can't be turned off" };
  }
  const problem = await confirmIdentity(user.id, password, code);
  if (problem) return { ok: false, error: problem };
  await db
    .update(users)
    .set({ totpSecret: null, totpPendingSecret: null, totpEnabledAt: null, totpLastStep: null, recoveryCodes: [] })
    .where(eq(users.id, user.id));
  await logActivity({ actorId: user.id, category: "security", summary: "Turned off two-step login" });
  await notifySecurity(user.email, "Two-step login was just turned OFF for your account.");
  revalidatePath("/security");
  return { ok: true };
}

export async function regenerateRecoveryCodes(password: string, code: string): Promise<SetupFinish> {
  const { user } = await me();
  if (!user.totpEnabledAt) return { ok: false, error: "turn on two-step login first" };
  const problem = await confirmIdentity(user.id, password, code);
  if (problem) return { ok: false, error: problem };
  const { plain, hashes } = generateRecoveryCodes();
  await db.update(users).set({ recoveryCodes: hashes }).where(eq(users.id, user.id));
  await logActivity({ actorId: user.id, category: "security", summary: "Made a new set of backup codes" });
  await notifySecurity(user.email, "A new set of backup codes was created for your account. The old ones no longer work.");
  return { ok: true, recoveryCodes: plain };
}

/** Admin only: for someone who lost their phone. Clears their two-step login
 * (they must set it up again at next sign-in, which also signs out everything
 * they had open). Not allowed on your own account. */
export async function adminResetTwoStep(userId: string): Promise<Result> {
  const session = await requireAdmin();
  if (!(await stepUpValidUntil(session.user.id))) {
    return { ok: false, error: "Locked — enter your 6-digit code in the bar at the top of the admin console first." };
  }
  if (userId === session.user.id) return { ok: false, error: "ask a different admin to reset yours" };
  const target = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { email: true } });
  if (!target) return { ok: false, error: "account not found" };
  const now = new Date();
  await db
    .update(users)
    .set({
      totpSecret: null,
      totpPendingSecret: null,
      totpEnabledAt: null,
      totpLastStep: null,
      recoveryCodes: [],
      // The old password is thrown away too. Otherwise anyone who knew it
      // could sign in right now and enrol THEIR phone in its place. The
      // person gets back in with "Forgot your password?" (an email link), or
      // an admin gives them a new temporary password in person.
      passwordHash: await bcrypt.hash(randomBytes(32).toString("hex"), BCRYPT_COST),
      mustChangePassword: false,
      passwordChangedAt: now,
      updatedAt: now,
    })
    .where(eq(users.id, userId));
  await logActivity({ actorId: session.user.id, category: "security", summary: `Reset two-step login and password for ${await nameOf(userId)}` });
  await notifySecurity(target.email, "Two-step login was reset on your account by the office, and your password was cleared. Use \"Forgot your password?\" on the sign-in page to choose a new one, then set up two-step login again.");
  revalidatePath("/portal/admin/security");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Encryption status + backfill

const MAGIC_HEX = Buffer.from(MAGIC_BYTES).toString("hex");

export type EncryptionStatus = {
  configured: boolean;
  documents: { total: number; pending: number };
  forms: { total: number; pending: number };
  submissions: { total: number; pending: number };
};

function pendingFileSql(col: typeof documents.fileData | typeof forms.fileData) {
  const keyId = currentKeyId();
  const keyHex = keyId ? keyId.toString("hex") : "00000000";
  return sql`(substring(${col} from 1 for 6) <> decode(${MAGIC_HEX}, 'hex') or substring(${col} from 8 for 4) <> decode(${keyHex}, 'hex'))`;
}

function submissionNeedsWork(answers: unknown): boolean {
  if (!isEncryptedJson(answers)) return true;
  const kid = currentKeyId();
  if (!kid) return false;
  const raw = Buffer.from(answers.enc.slice(0, 24), "base64");
  return !raw.subarray(7, 11).equals(kid);
}

export async function getEncryptionStatus(): Promise<EncryptionStatus> {
  await requireAdmin();
  const [d] = await db
    .select({ total: sql<number>`count(*)::int`, pending: sql<number>`count(*) filter (where ${pendingFileSql(documents.fileData)})::int` })
    .from(documents);
  const [f] = await db
    .select({ total: sql<number>`count(*)::int`, pending: sql<number>`count(*) filter (where ${pendingFileSql(forms.fileData)})::int` })
    .from(forms);
  const subs = await db.select({ id: formSubmissions.id, answers: formSubmissions.answers }).from(formSubmissions);
  return {
    configured: encryptionConfigured(),
    documents: { total: d.total, pending: d.pending },
    forms: { total: f.total, pending: f.pending },
    submissions: { total: subs.length, pending: subs.filter((s) => submissionNeedsWork(s.answers)).length },
  };
}

/** Admin only. Encrypts anything stored before encryption was switched on, and
 * re-encrypts anything still under a retired key. Works in small batches for
 * up to ~20 seconds per click; click again if the counts aren't zero yet. */
export async function encryptExistingData(): Promise<{ ok: boolean; error?: string; status?: EncryptionStatus }> {
  const session = await requireAdmin();
  if (!encryptionConfigured()) return { ok: false, error: "set DATA_ENCRYPTION_KEY on the server first" };
  const deadline = Date.now() + 20_000;
  let changed = 0;

  for (const kind of ["documents", "forms"] as const) {
    const table = kind === "documents" ? documents : forms;
    const context = kind === "documents" ? ctx.document : ctx.form;
    while (Date.now() < deadline) {
      const batch = await db.select({ id: table.id }).from(table).where(pendingFileSql(table.fileData)).limit(3);
      if (batch.length === 0) break;
      for (const { id } of batch) {
        const [row] = await db.select({ data: table.fileData }).from(table).where(eq(table.id, id));
        if (!row) continue;
        const plain = decryptBytes(row.data, context(id));
        await db.update(table).set({ fileData: encryptBytes(plain, context(id)) }).where(eq(table.id, id));
        changed++;
      }
    }
  }

  const subs = await db.select({ id: formSubmissions.id, answers: formSubmissions.answers }).from(formSubmissions);
  for (const s of subs) {
    if (Date.now() > deadline) break;
    if (!submissionNeedsWork(s.answers)) continue;
    const plain = decryptJson<FormAnswer[]>(s.answers, ctx.answers(s.id));
    await db.update(formSubmissions).set({ answers: encryptJson(plain, ctx.answers(s.id)) }).where(eq(formSubmissions.id, s.id));
    changed++;
  }

  if (changed > 0) {
    await logActivity({ actorId: session.user.id, category: "security", summary: `Encrypted ${changed} stored item${changed === 1 ? "" : "s"}` });
  }
  revalidatePath("/portal/admin/security");
  return { ok: true, status: await getEncryptionStatus() };
}

// ---------------------------------------------------------------------------
// Sensitive-action unlock + sign out everywhere

/** Enter a fresh 6-digit code (or a backup code) to unlock the sensitive admin
 * actions for 10 minutes. */
export async function unlockSensitiveActions(code: string): Promise<{ ok: true; until: string } | { ok: false; error: string }> {
  const { user } = await me();
  if (!user.totpEnabledAt) return { ok: false, error: "turn on two-step login first" };
  const lock = await tooMany("2fa-change", user.email);
  if (lock) {
    return { ok: false, error: lock };
  }
  const used = await verifySecondFactor(user, String(code ?? ""));
  if (!used) return { ok: false, error: "that code didn't work — wait for the next one from your app and try again" };
  await clearFailures("2fa-change", user.email, null);
  await db.update(users).set({ stepUpAt: new Date() }).where(eq(users.id, user.id));
  const until = await stepUpValidUntil(user.id);
  revalidatePath("/portal/admin", "layout");
  return { ok: true, until: (until ?? new Date()).toISOString() };
}

/** Signing out ends THIS sign-in only (other devices stay signed in; an admin
 * can see and end those from the Users page, and changing the password ends
 * them all). */
export async function endCurrentSession() {
  // Uses the state (not getSession) so someone stuck on a "choose a password"
  // or "set up two-step" screen can still sign out properly.
  const state = await getSessionState();
  if (!state?.session.sid) return;
  await revokeSession(state.session.sid, state.session.user.id, "signed out");
}
