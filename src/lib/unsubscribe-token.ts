import crypto from "node:crypto";

// Signs an email into a short token so an unsubscribe link works without
// requiring the recipient to log in, but can't be forged to unsubscribe
// someone else. Required by CAN-SPAM: every marketing email needs a working,
// no-login opt-out link.
const SECRET = process.env.NEWSLETTER_UNSUBSCRIBE_SECRET ?? "embellish-antiques-unsub-signing-secret";

export function signUnsubscribeToken(email: string): string {
  const hmac = crypto.createHmac("sha256", SECRET).update(email.toLowerCase()).digest("hex");
  return Buffer.from(`${email.toLowerCase()}:${hmac}`).toString("base64url");
}

export function verifyUnsubscribeToken(token: string): string | null {
  try {
    const [email, hmac] = Buffer.from(token, "base64url").toString("utf8").split(":");
    const expected = crypto.createHmac("sha256", SECRET).update(email).digest("hex");
    return hmac === expected ? email : null;
  } catch {
    return null;
  }
}
