import { createHmac, randomInt } from "node:crypto";
import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { decryptText } from "@/lib/crypto";
import { currentStep, verifyTotp } from "@/lib/totp";

export const totpContext = (userId: string) => `users.totp:${userId}`;

const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
const RECOVERY_COUNT = 10;

function normalizeRecovery(code: string) {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// Keyed with the site secret, so a stolen copy of the database can't be
// brute-forced offline. (Changing NEXTAUTH_SECRET invalidates unused backup
// codes — make new ones afterwards.)
const hashRecovery = (code: string) =>
  createHmac("sha256", process.env.NEXTAUTH_SECRET ?? "").update(normalizeRecovery(code)).digest("hex");

/** Ten single-use backup codes, shown once. Only hashes are stored. */
export function generateRecoveryCodes() {
  const plain: string[] = [];
  for (let i = 0; i < RECOVERY_COUNT; i++) {
    let c = "";
    for (let j = 0; j < 10; j++) c += RECOVERY_ALPHABET[randomInt(RECOVERY_ALPHABET.length)];
    plain.push(`${c.slice(0, 5)}-${c.slice(5)}`);
  }
  return { plain, hashes: plain.map(hashRecovery) };
}

/** A backup code has letters in it; an app code is exactly six digits. */
export function looksLikeRecoveryCode(input: string) {
  return !/^\s*\d{3}\s?\d{3}\s*$/.test(input);
}

type SecondFactorUser = {
  id: string;
  totpSecret: string | null;
  totpLastStep: number | null;
};

/** Check a six-digit app code or a backup code for this account. A code can be
 * used only once (an app code's 30-second window is remembered; a backup code
 * is deleted). The "claim" is a single conditional UPDATE, so two people
 * submitting the same code at once can't both get in. */
export async function verifySecondFactor(user: SecondFactorUser, input: string): Promise<"app" | "backup" | null> {
  if (looksLikeRecoveryCode(input)) {
    const hash = hashRecovery(input);
    if (normalizeRecovery(input).length !== 10) return null;
    const claimed = await db
      .update(users)
      .set({ recoveryCodes: sql`array_remove(${users.recoveryCodes}, ${hash})` })
      .where(and(eq(users.id, user.id), sql`${hash} = any(${users.recoveryCodes})`))
      .returning({ id: users.id });
    return claimed.length > 0 ? "backup" : null;
  }

  if (!user.totpSecret) return null;
  let secret: string;
  try {
    secret = decryptText(user.totpSecret, totpContext(user.id));
  } catch {
    return null;
  }
  const step = verifyTotp(secret, input);
  if (step === null) return null;
  if (user.totpLastStep !== null && step <= user.totpLastStep) return null;
  const claimed = await db
    .update(users)
    .set({ totpLastStep: step })
    .where(and(eq(users.id, user.id), or(isNull(users.totpLastStep), lt(users.totpLastStep, step))))
    .returning({ id: users.id });
  return claimed.length > 0 ? "app" : null;
}

export { currentStep };
